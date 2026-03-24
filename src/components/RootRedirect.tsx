import { Navigate } from 'react-router-dom';

const RootRedirect = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role === 'admin') {
        return <Navigate to="/admin/logs" replace />;
    }

    return <Navigate to="/dashboard/maintenance" replace />;
};

export default RootRedirect;
