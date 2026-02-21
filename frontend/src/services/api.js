import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Only attach default token if the request
    // didn't already provide its own Authorization header
    if (token && !config.headers?.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API — matches backend: register-basic → verify-otp → register-complete; login; resend-otp; me
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  registerBasic: (data) => api.post('/auth/register-basic', data),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  registerComplete: (data) => api.post('/auth/register-complete', data),
  resendOTP: (email) => api.post('/auth/resend-otp', { email }),
  getMe: () => api.get('/auth/me'),
};

// Events API
export const eventAPI = {
  getEvents: (params) => api.get('/events', { params }),
  createEvent: (data) => api.post('/events', data),
  getAdminEvents: () => api.get('/events/admin/all'),
  getEventById: (eventId) => api.get(`/events/${eventId}`),
  updateEvent: (eventId, data) => api.patch(`/events/${eventId}`, data),
  deleteEvent: (eventId) => api.delete(`/events/${eventId}`),
  uploadProblemStatement: (eventId, pdfBase64) =>
    api.post(`/events/${eventId}/problem-statement`, { pdfBase64 }),
};

// Teams API
export const teamAPI = {
  getMyTeams: () => api.get('/teams/my-teams'),
  getTeamsByEvent: (eventId) => api.get(`/teams/event/${eventId}`),
  createTeam: (data) => api.post('/teams', data),
};

// Submissions API
export const submissionAPI = {
  getSubmissionsByEvent: (eventId) => api.get(`/submissions/event/${eventId}`),
};

// Announcements API
export const announcementAPI = {
  create: (data) => api.post('/announcements', data),
  getByEvent: (eventId) => api.get(`/announcements/event/${eventId}`),
  delete: (announcementId) => api.delete(`/announcements/${announcementId}`),
};

// Shortlist API
export const shortlistAPI = {
  getShortlistedTeams: (eventId) => api.get(`/shortlist/${eventId}`),
  getLeaderboard: (eventId) => api.get(`/shortlist/leaderboard/${eventId}`),
  confirmShortlist: (eventId) => api.post(`/shortlist/confirm/${eventId}`),
  confirmGrandFinale: (eventId) => api.post(`/shortlist/confirm-grand-finale/${eventId}`),
  getGrandFinaleTeams: (eventId) => api.get(`/shortlist/grand-finale/${eventId}`),
  scorePPT: (data) => api.post('/shortlist/score', data),
};

// QR API
export const qrAPI = {
  getAttendance: (eventId) => api.get(`/qr/attendance/${eventId}`),
  generateEntryQRs: (eventId) => api.post(`/qr/generate/${eventId}`),
  scanEntry: (qrToken) => api.post('/qr/scan', { qrToken }),
};

// Food QR API
export const foodQrAPI = {
  getFoodReport: (eventId) => api.get(`/food-qr/report/${eventId}`),
  lookupFood: (qrToken) => api.post('/food-qr/lookup', { qrToken }),
  scanFood: (qrToken) => api.post('/food-qr/scan', { qrToken }),
  getFoodQRsForUser: (eventId, userId) => api.get(`/food-qr/event/${eventId}/user/${userId}`),
};

// Judges API (admin + judge)
export const judgeAPI = {
  // Admin
  createJudge: (data) => api.post('/judges/create', data),
  getAllJudges: () => api.get('/judges'),
  getJudgesByEvent: (eventId) => api.get(`/judges/event/${eventId}`),
  assignTeams: (eventId, judgeId, teamIds) => api.post('/judges/assign', { eventId, judgeId, teamIds }),
  unassignTeam: (eventId, judgeId, teamId) => api.delete('/judges/unassign', { data: { eventId, judgeId, teamId } }),
  getEventScores: (eventId) => api.get(`/judges/scores/${eventId}`),
  lockScores: (eventId) => api.patch(`/judges/lock/${eventId}`),
  // Judge
  getMyEvents: () => api.get('/judges/my-events'),
  getMyAssignedTeams: (eventId) => api.get(`/judges/my-teams/${eventId}`),
  scoreTeam: (data) => api.post('/judges/score', data),
};

export default api;
