import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import EventDashboard from './pages/EventDashboard';
import ManageEvent from './pages/ManageEvent';
import StudentDashboard from './pages/StudentDashboard';
import StudentEventDetail from './pages/StudentEventDetail';
import StudentEventDashboard from './pages/StudentEventDashboard';
import StudentMyEvents from './pages/StudentMyEvents';
import StudentTeams from './pages/StudentTeams';
import StudentQRCodes from './pages/StudentQRCodes';
import StudentAnnouncements from './pages/StudentAnnouncements';
import StudentProfile from './pages/StudentProfile';
import JudgeDashboard from './pages/JudgeDashboard';
import JudgeScoreTeam from './pages/JudgeScoreTeam';
import AdminEvaluatePPT from './pages/AdminEvaluatePPT';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/events/:eventId" element={<EventDashboard />} />
        <Route path="/admin/events/:eventId/announcements" element={<EventDashboard />} />
        <Route path="/admin/events/:eventId/message" element={<EventDashboard />} />
        <Route path="/admin/events/:eventId/manage" element={<ManageEvent />} />
        <Route path="/admin/events/:eventId/submissions/evaluate" element={<AdminEvaluatePPT />} />

        {/* Judge */}
        <Route path="/judge/dashboard" element={<JudgeDashboard />} />
        <Route path="/judge/events/:eventId/teams/:teamId/score" element={<JudgeScoreTeam />} />

        {/* Student */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/my-events" element={<StudentMyEvents />} />
        <Route path="/student/teams" element={<StudentTeams />} />
        <Route path="/student/qr-codes" element={<StudentQRCodes />} />
        <Route path="/student/announcements" element={<StudentAnnouncements />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/events/:eventId" element={<StudentEventDetail />} />
        <Route path="/student/events/:eventId/dashboard" element={<StudentEventDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
