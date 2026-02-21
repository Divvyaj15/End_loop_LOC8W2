import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import EventDashboard from './pages/EventDashboard';
import ManageEvent from './pages/ManageEvent';
import StudentDashboard from './pages/StudentDashboard';
import StudentEventDetail from './pages/StudentEventDetail';
import StudentMyEvents from './pages/StudentMyEvents';
import StudentPlaceholder from './pages/StudentPlaceholder';
import StudentProfile from './pages/StudentProfile';
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
        <Route path="/admin/events/:eventId/manage" element={<ManageEvent />} />

        {/* Student */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/my-events" element={<StudentMyEvents />} />
        <Route path="/student/announcements" element={<StudentPlaceholder title="Announcements" />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/events/:eventId" element={<StudentEventDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
