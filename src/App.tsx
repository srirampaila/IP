import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MaintenanceLogs from "./pages/MaintenanceLogs";
import ProfileSetup from "./pages/ProfileSetup";
import ProfilePage from "./pages/ProfilePage";

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!user || user.role !== 'admin') {
    alert('Access Denied: Admin privileges required.');
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/room-status" element={<ProtectedAdminRoute><Dashboard defaultTab="rooms" /></ProtectedAdminRoute>} />
        <Route path="/visitor-logs" element={<ProtectedAdminRoute><Dashboard defaultTab="visitors" /></ProtectedAdminRoute>} />
        <Route path="/maintenance" element={<MaintenanceLogs />} />
      </Routes>
    </Router>
  );
}

export default App;
