import { supabaseAdmin }                from "../config/supabase.js";
import { TEAM_STATUS, MEMBER_STATUS }   from "../models/team.model.js";
import { sendTeamInviteEmail }          from "../utils/mailer.js";
import { syncEventStatus }              from "../utils/statusSync.js";

// ─── Helper: send notification to a user ─────────────────────────────────────
const sendNotification = async (userId, title, message, type = "general", data = {}) => {
  await supabaseAdmin.from("notifications").insert({ user_id: userId, title, message, type, data });
};

// ─── Helper: check if team is fully confirmed ─────────────────────────────────
const checkAndConfirmTeam = async (teamId) => {
  const { data: members } = await supabaseAdmin
    .from("team_members")
    .select("status, user_id")
    .eq("team_id", teamId);

  const allAccepted = members.every(
    (m) => m.status === MEMBER_STATUS.LEADER || m.status === MEMBER_STATUS.ACCEPTED
  );

  if (allAccepted) {
    await supabaseAdmin
      .from("teams")
      .update({ status: TEAM_STATUS.CONFIRMED, updated_at: new Date().toISOString() })
      .eq("id", teamId);

    // Notify all members team is confirmed
    for (const member of members) {
      await sendNotification(
        member.user_id,
        "🎉 Team Confirmed!",
        "Your team has been confirmed. All members have accepted the invitation!",
        "team_confirmed",
        { teamId }
      );
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/teams
 * Student creates a team for an event (= registering for event)
 * Body: { eventId, teamName, memberEmails: [] }
 */
export const createTeam = async (req, res, next) => {
  try {
    const { eventId, teamName, memberEmails = [] } = req.body;
    const leaderId = req.user.id;

    // 1. Check event exists and registration is open (sync status from dates)
    const { data: eventRow } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!eventRow) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const event = await syncEventStatus(eventRow);
    if (event.status !== "registration_open") {
      return res.status(400).json({ success: false, message: "Event registration is not open" });
    }

    // 2. Check leader not already in a team for this event
    const { data: leaderTeams } = await supabaseAdmin
      .from("team_members")
      .select("team_id, teams!inner(event_id)")
      .eq("user_id", leaderId)
      .eq("teams.event_id", eventId);

    if (leaderTeams && leaderTeams.length > 0) {
      return res.status(409).json({ success: false, message: "You are already in a team for this event" });
    }

    // 3. Validate team size
    const totalSize = memberEmails.length + 1; // +1 for leader
    if (!event.allow_individual && totalSize < event.min_team_size) {
      return res.status(400).json({ success: false, message: `Minimum team size is ${event.min_team_size}` });
    }
    if (totalSize > event.max_team_size) {
      return res.status(400).json({ success: false, message: `Maximum team size is ${event.max_team_size}` });
    }

    // 4. Validate all member emails are registered students
    const memberIds = [];
    for (const email of memberEmails) {
      const { data: member } = await supabaseAdmin
        .from("users")
        .select("id, first_name, role, otp_verified")
        .eq("email", email.trim())
        .single();

      if (!member) {
        return res.status(400).json({ success: false, message: `No registered user found with email: ${email}` });
      }
      if (member.role !== "student") {
        return res.status(400).json({ success: false, message: `${email} is not a student` });
      }
      if (!member.otp_verified) {
        return res.status(400).json({ success: false, message: `${email} has not verified their account yet` });
      }

      // Check not already in a team for this event
      const { data: memberTeams } = await supabaseAdmin
        .from("team_members")
        .select("team_id, teams!inner(event_id)")
        .eq("user_id", member.id)
        .eq("teams.event_id", eventId);

      if (memberTeams && memberTeams.length > 0) {
        return res.status(409).json({ success: false, message: `${email} is already in a team for this event` });
      }

      memberIds.push({ id: member.id, email, name: member.first_name });
    }

    // 5. Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .insert({ team_name: teamName, event_id: eventId, leader_id: leaderId, status: TEAM_STATUS.PENDING })
      .select()
      .single();

    if (teamError) {
      if (teamError.code === "23505") {
        return res.status(409).json({ success: false, message: "Team name already taken for this event" });
      }
      throw teamError;
    }

    // 6. Add leader as first member
    await supabaseAdmin.from("team_members").insert({
      team_id:   team.id,
      user_id:   leaderId,
      status:    MEMBER_STATUS.LEADER,
      joined_at: new Date().toISOString(),
    });

    // 7. Add teammates as pending + send notifications
    // Get leader name for email
    const { data: leader } = await supabaseAdmin
      .from("users")
      .select("first_name, last_name")
      .eq("id", leaderId)
      .single();

    const leaderName = leader ? `${leader.first_name} ${leader.last_name}` : "Team Leader";

    for (const member of memberIds) {
      await supabaseAdmin.from("team_members").insert({
        team_id: team.id,
        user_id: member.id,
        status:  MEMBER_STATUS.PENDING,
      });

      // Send inbox notification to teammate
      await sendNotification(
        member.id,
        "📩 Team Invitation",
        `You've been invited to join team "${teamName}". Accept or decline the invitation.`,
        "team_invite",
        { teamId: team.id, eventId, teamName }
      );

      // Send email notification to teammate
      try {
        await sendTeamInviteEmail(member.email, {
          inviteeName: member.name,
          leaderName,
          teamName,
          eventName: event.title,
        });
      } catch (emailErr) {
        console.error(`[EMAIL] Failed to send invite to ${member.email}:`, emailErr.message);
        // Don't fail the request if email fails
      }
    }

    // 8. If no teammates (individual), confirm immediately
    if (memberEmails.length === 0) {
      await supabaseAdmin
        .from("teams")
        .update({ status: TEAM_STATUS.CONFIRMED, updated_at: new Date().toISOString() })
        .eq("id", team.id);
    }

    res.status(201).json({
      success: true,
      message: memberEmails.length > 0
        ? "Team created! Invitations sent to teammates."
        : "Team created and confirmed!",
      data: { teamId: team.id, teamName, status: TEAM_STATUS.PENDING },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/teams/:teamId/accept
 * Teammate accepts team invitation
 */
export const acceptInvite = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;

    const { data: membership } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }
    if (membership.status !== MEMBER_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: `Invitation already ${membership.status}` });
    }

    await supabaseAdmin
      .from("team_members")
      .update({ status: MEMBER_STATUS.ACCEPTED, joined_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("user_id", userId);

    // Check if all members accepted → confirm team
    await checkAndConfirmTeam(teamId);

    res.status(200).json({ success: true, message: "Invitation accepted!" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/teams/:teamId/decline
 * Teammate declines or leaves team
 */
export const declineOrLeave = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;

    const { data: membership } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      return res.status(404).json({ success: false, message: "Membership not found" });
    }
    if (membership.status === MEMBER_STATUS.LEADER) {
      return res.status(400).json({ success: false, message: "Team leader cannot leave. Delete the team instead." });
    }

    // Remove member from team
    await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);

    // Notify team leader
    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("leader_id, team_name")
      .eq("id", teamId)
      .single();

    const { data: leavingUser } = await supabaseAdmin
      .from("users")
      .select("first_name, email")
      .eq("id", userId)
      .single();

    await sendNotification(
      team.leader_id,
      "❌ Member Left",
      `${leavingUser.first_name} (${leavingUser.email}) has declined/left your team "${team.team_name}".`,
      "general",
      { teamId }
    );

    // Set team back to pending if it was confirmed
    await supabaseAdmin
      .from("teams")
      .update({ status: TEAM_STATUS.PENDING, updated_at: new Date().toISOString() })
      .eq("id", teamId);

    res.status(200).json({ success: true, message: "You have left the team" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/teams/my-teams
 * Student gets all their teams across events
 */
export const getMyTeams = async (req, res, next) => {
  try {
    const { data: teams, error } = await supabaseAdmin
      .from("team_members")
      .select(`
        status,
        joined_at,
        teams (
          id, team_name, status, event_id, leader_id, created_at,
          events!teams_event_id_fkey ( title, start_date, end_date, committee_name )
        )
      `)
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.status(200).json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/teams/:teamId
 * Get team details with all members and their status
 */
export const getTeamById = async (req, res, next) => {
  try {
    const { data: team, error } = await supabaseAdmin
      .from("teams")
      .select(`
        *,
        events!teams_event_id_fkey ( title, start_date, end_date, committee_name ),
        team_members (
          status, joined_at,
          users ( id, first_name, last_name, email )
        )
      `)
      .eq("id", req.params.teamId)
      .single();

    if (error || !team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    res.status(200).json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * DELETE /api/teams/:teamId
 * Leader deletes team (only if pending)
 */
export const deleteTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;

    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("id, leader_id, status, team_name")
      .eq("id", teamId)
      .single();

    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }
    if (team.leader_id !== userId) {
      return res.status(403).json({ success: false, message: "Only team leader can delete the team" });
    }
    if (team.status === TEAM_STATUS.CONFIRMED) {
      return res.status(400).json({ success: false, message: "Cannot delete a confirmed team" });
    }

    // Notify all members before deleting
    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .neq("user_id", userId);

    for (const member of members) {
      await sendNotification(
        member.user_id,
        "🗑️ Team Dissolved",
        `The team "${team.team_name}" has been dissolved by the leader.`,
        "general",
        { teamId }
      );
    }

    await supabaseAdmin.from("teams").delete().eq("id", teamId);

    res.status(200).json({ success: true, message: "Team deleted" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/teams/event/:eventId
 * Admin gets all teams for an event
 */
export const getTeamsByEvent = async (req, res, next) => {
  try {
    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select(`
        *,
        team_members (
          status,
          users ( id, first_name, last_name, email )
        )
      `)
      .eq("event_id", req.params.eventId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
};