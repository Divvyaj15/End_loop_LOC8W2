import { supabaseAdmin } from "../config/supabase.js";
import { generateCertificatePNG } from "../utils/certificateGenerator.js";
import { uploadImage, getPublicUrl } from "../utils/storage.js";
import { sendCertificateEmail } from "../utils/mailer.js";

// ─── Helper: generate unique certificate ID ───────────────────────────────────
const generateCertId = (eventTitle, index) => {
    const prefix = eventTitle
        .split(" ")
        .map((w) => w[0].toUpperCase())
        .join("")
        .substring(0, 6);
    const year = new Date().getFullYear();
    const num = String(index + 1).padStart(3, "0");
    return `CERT-${prefix}${year}-${num}`;
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/certificates/generate/:eventId
 * Admin generates participation certificates for ALL shortlisted teams
 * (teams that cleared PPT round = shortlisted teams)
 */
export const generateCertificates = async (req, res, next) => {
    try {
        const { eventId } = req.params;

        // Get event details
        const { data: event } = await supabaseAdmin
            .from("events")
            .select("id, title, start_date, end_date, committee_name, status")
            .eq("id", eventId)
            .single();

        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        if (!["hackathon_active", "judging", "completed"].includes(event.status)) {
            return res.status(400).json({
                success: false,
                message: "Certificates can only be generated after shortlisting is confirmed",
            });
        }

        // Get all shortlisted teams with members
        const { data: shortlisted } = await supabaseAdmin
            .from("shortlisted_teams")
            .select(`
        team_id,
        teams (
          id, team_name,
          team_members (
            status,
            users ( id, first_name, last_name, email )
          )
        )
      `)
            .eq("event_id", eventId);

        if (!shortlisted || shortlisted.length === 0) {
            return res.status(400).json({ success: false, message: "No shortlisted teams found" });
        }

        // Format event date
        const startDate = new Date(event.start_date).toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric"
        });
        const endDate = new Date(event.end_date).toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric"
        });
        const eventDate = `${startDate} – ${endDate}`;

        let generated = 0;
        let skipped = 0;
        let certIndex = 0;

        for (const { teams: team } of shortlisted) {
            const members = (team.team_members || []).filter(
                (m) => ["leader", "accepted"].includes(m.status)
            );

            for (const member of members) {
                const user = member.users;

                // Check if certificate already exists
                const { data: existing } = await supabaseAdmin
                    .from("certificates")
                    .select("id")
                    .eq("event_id", eventId)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (existing) {
                    skipped++;
                    continue;
                }

                const certificateId = generateCertId(event.title, certIndex++);

                // Generate PNG certificate
                const pngBuffer = generateCertificatePNG({
                    participantName: `${user.first_name} ${user.last_name}`,
                    teamName: team.team_name,
                    eventName: event.title,
                    eventDate,
                    committeeName: event.committee_name,
                    certificateId,
                });

                // Upload PNG to Supabase Storage (certificates bucket - public)
                const base64PNG = `data:image/png;base64,${pngBuffer.toString("base64")}`;
                const pdf_url = await uploadImage(base64PNG, "certificate", `${eventId}/${user.id}`);

                // Save to DB
                await supabaseAdmin.from("certificates").insert({
                    event_id: eventId,
                    user_id: user.id,
                    team_id: team.id,
                    certificate_id: certificateId,
                    pdf_url,
                });

                // Notify student
                await supabaseAdmin.from("notifications").insert({
                    user_id: user.id,
                    title: "🏆 Your Certificate is Ready!",
                    message: `Your participation certificate for "${event.title}" has been generated. Download it from your dashboard.`,
                    type: "certificate",
                    data: { eventId, certificateId, pdf_url },
                });

                // Send Email to the student
                await sendCertificateEmail(user.email, {
                    name: user.first_name,
                    eventName: event.title,
                    certificateUrl: pdf_url,
                });

                generated++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Certificates generated successfully`,
            data: { generated, skipped, total: generated + skipped },
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/certificates/my/:eventId
 * Student downloads their certificate
 */
export const getMyCertificate = async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("certificates")
            .select("certificate_id, pdf_url, generated_at")
            .eq("event_id", req.params.eventId)
            .eq("user_id", req.user.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: "Certificate not found. Please check back later." });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/certificates/event/:eventId
 * Admin views all certificates for an event
 */
export const getEventCertificates = async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("certificates")
            .select(`
        certificate_id, pdf_url, generated_at,
        users ( first_name, last_name, email ),
        teams ( team_name )
      `)
            .eq("event_id", req.params.eventId)
            .order("generated_at", { ascending: true });

        if (error) throw error;

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/certificates/verify/:certificateId
 * Public — verify certificate authenticity
 */
export const verifyCertificate = async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("certificates")
            .select(`
        certificate_id, pdf_url, generated_at,
        users ( first_name, last_name ),
        teams ( team_name ),
        events ( title, start_date, end_date, committee_name )
      `)
            .eq("certificate_id", req.params.certificateId)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: "Invalid certificate ID" });
        }

        res.status(200).json({
            success: true,
            message: "Certificate is valid ✅",
            data: {
                certificateId: data.certificate_id,
                participantName: `${data.users.first_name} ${data.users.last_name}`,
                teamName: data.teams.team_name,
                eventName: data.events.title,
                eventDate: data.events.start_date,
                committee: data.events.committee_name,
                generatedAt: data.generated_at,
            },
        });
    } catch (err) {
        next(err);
    }
};