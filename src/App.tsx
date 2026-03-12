import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MaintenanceLogs from "./pages/MaintenanceLogs";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/maintenance" element={<MaintenanceLogs />} />
      </Routes>
    </Router>
  );
}

export default App;
