export const TEAM_STATUS = {
    PENDING:       "pending",       // waiting for all members to accept
    CONFIRMED:     "confirmed",     // all members accepted
    DISQUALIFIED:  "disqualified",
  };
  
  export const MEMBER_STATUS = {
    LEADER:   "leader",    // auto-confirmed, team creator
    PENDING:  "pending",   // invite sent, waiting
    ACCEPTED: "accepted",  // accepted invite
    DECLINED: "declined",  // rejected invite
  };