import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import ManageEvent from './pages/ManageEvent';
import StudentDashboard from './pages/StudentDashboard';
import StudentTeams from './pages/StudentTeams';
import StudentHackathons from './pages/StudentHackathons';
import StudentQRs from './pages/StudentQRs';
import CreateTeam from './pages/CreateTeam';
import HackathonDetails from './pages/HackathonDetails';
import LiveEvent from './pages/LiveEvent';
import EventSelection from './pages/EventSelection';
import EventDashboard from './pages/EventDashboard';
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
        <Route path="/admin/events/:eventId/manage" element={<ManageEvent />} />

        {/* Student */}
        <Route path="/student/dashboard" element={<StudentDashboard />}>
          <Route index element={<Navigate to="hackathons" replace />} />
          <Route path="teams" element={<StudentTeams />} />
          <Route path="hackathons" element={<StudentHackathons />} />
          <Route path="qrs" element={<StudentQRs />} />
          <Route path="events" element={<EventSelection />} />
          <Route path="events/dashboard" element={<EventSelection />} />
          <Route path="events/:eventId/create-team" element={<CreateTeam />} />
          <Route path="events/:eventId/live" element={<LiveEvent />} />
          <Route path="events/:eventId/dashboard" element={<EventDashboard />} />
          <Route path="events/:eventId" element={<HackathonDetails />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
