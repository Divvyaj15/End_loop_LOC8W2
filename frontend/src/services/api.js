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

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  registerBasic: (data) => api.post('/auth/register-basic', data),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  // registerComplete now expects tempToken in the body (no auth header)
  registerComplete: (data) => api.post('/auth/register-complete', data),
  getMe: () => api.get('/auth/me'),
};

// Teams API (student)
export const teamsAPI = {
  getMyTeams: () => api.get('/teams/my-teams'),
  createTeam: (data) => api.post('/teams', data),
  getTeamById: (teamId) => api.get(`/teams/${teamId}`),
  acceptInvite: (teamId) => api.post(`/teams/${teamId}/accept`),
  declineInvite: (teamId) => api.post(`/teams/${teamId}/decline`),
};

// QR API (student)
export const qrAPI = {
  getMyQr: (eventId) => api.get(`/qr/my-qr/${eventId}`),
};

// Food QR API (student)
export const foodQrAPI = {
  getMyMeals: (eventId) => api.get(`/food-qr/my-meals/${eventId}`),
};

// Submissions API (student)
export const submissionsAPI = {
  getTeamSubmission: (teamId) => api.get(`/submissions/team/${teamId}`),
  submitPPT: (data) => api.post('/submissions', data),
  getProblemStatement: (eventId) => api.get(`/submissions/event/${eventId}/problem-statement`),
  getFinalSubmission: (teamId) => api.get(`/submissions/final/${teamId}`),
  submitFinalPPT: (data) => api.post('/submissions/final-ppt', data),
  submitFinalGitHub: (data) => api.post('/submissions/final-github', data),
  submitFinalVideo: (data) => api.post('/submissions/final-video', data),
};

// Events API (admin + public)
export const eventAPI = {
  getAllEvents: () => api.get('/events'),
  createEvent: (data) => api.post('/events', data),
  getAdminEvents: () => api.get('/events/admin/all'),
  getEventById: (eventId) => api.get(`/events/${eventId}`),
  updateEvent: (eventId, data) => api.patch(`/events/${eventId}`, data),
  deleteEvent: (eventId) => api.delete(`/events/${eventId}`),
  uploadProblemStatement: (eventId, pdfBase64) =>
    api.post(`/events/${eventId}/problem-statement`, { pdfBase64 }),
};

// Announcements API (student/admin)
export const announcementsAPI = {
  getByEvent: (eventId) => api.get(`/announcements/event/${eventId}`),
};

// Shortlist API (student)
export const shortlistAPI = {
  getShortlistedTeams: (eventId) => api.get(`/shortlist/${eventId}`),
  checkTeamShortlisted: (eventId, teamId) => api.get(`/shortlist/check/${eventId}/${teamId}`),
};

export default api;
