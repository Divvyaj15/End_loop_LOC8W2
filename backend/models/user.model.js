// ─── Firestore Collection: "users" ────────────────────────────────────────────
// Document ID = Firebase Auth UID

export const ROLES = {
    STUDENT: "student",
    ADMIN:   "admin",
    JUDGE:   "judge",
  };
  
  /**
   * Creates a new user document for Firestore
   */
  export const createUserDoc = ({
    uid,
    name,
    email,
    role         = ROLES.STUDENT,
    phone        = null,
    college      = null,
    collegeIdUrl = null,
    aadhaarNumber= null,
    selfieUrl    = null,
    isVerified   = false,  // true only after BOTH otpVerified + faceVerified
    otpVerified  = false,
    faceVerified = false,
    teamId       = null,
  }) => ({
    uid,
    name,
    email,
    role,
    phone,
    college,
    collegeIdUrl,
    aadhaarNumber,
    selfieUrl,
    isVerified,
    otpVerified,
    faceVerified,
    teamId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });