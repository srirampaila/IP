import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FeedbackForm from '../components/FeedbackForm';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';

interface MaintenanceLog {
    id: string;
    room: string;
    description: string;
    priority: string;
    status: string;
    date: string;
    feedback?: { rating: string, comments: string };
}

type PriorityOrder = {
    [key: string]: number;
};

const MaintenanceLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<MaintenanceLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('latest');

    // Auth logic
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isUser = user?.role === 'user';
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        const q = query(collection(db, 'maintenanceLogs'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({ ...doc.data() as MaintenanceLog, id: doc.id }));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching maintenance logs:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredLogs = useMemo(() => {
        let data = logs;

        if (isUser) {
            data = data.filter(item => item.room === user.roomId);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(item =>
                item.room.toLowerCase().includes(query) ||
                item.id.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query)
            );
        }

        return [...data].sort((a, b) => {
            if (sortOption === 'latest') {
                return (b.date || '').localeCompare(a.date || '');
            } else if (sortOption === 'status') {
                return (a.status || '').localeCompare(b.status || '');
            } else if (sortOption === 'priority') {
                const priorityOrder: PriorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
                return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
            }
            return 0;
        });
    }, [logs, searchQuery, sortOption]);

    const handleFeedbackSubmit = async (logId: string, rating: string, comments: string) => {
        try {
            await updateDoc(doc(db, 'maintenanceLogs', logId), {
                feedback: { rating, comments }
            });
        } catch (error) {
            console.error('Error submitting feedback:', error);
            throw error;
        }
    };

    return (
        <div className="container-fluid min-vh-100 bg-light">
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
                <div className="container">
                    <a className="navbar-brand" href="#" onClick={() => navigate('/dashboard')}>BMS - Maintenance</a>
                    <div className="collapse navbar-collapse justify-content-end">
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <button className="btn btn-outline-light me-2" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                            </li>
                            <li className="nav-item">
                                <button className="btn btn-outline-light" onClick={() => navigate('/')}>Logout</button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div className="row mb-4">
                    <div className="col-12">
                        <h2>Maintenance Logs</h2>
                        <p className="text-muted">Detailed view of all maintenance requests.</p>
                    </div>
                </div>

                <div className="row mb-4">
                    <div className="col-md-12">
                        <div className="card p-3">
                            <div className="row g-3">
                                <div className="col-md-8">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search Logs (ID, Room, Description)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <select className="form-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                                        <option value="latest">Sort by Latest</option>
                                        <option value="status">Sort by Status</option>
                                        <option value="priority">Sort by Priority</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card shadow-sm">
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>ID</th>
                                                <th>Room</th>
                                                <th>Description</th>
                                                <th>Priority</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                                {isAdmin && <th>Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                                            ) : filteredLogs.length > 0 ? (
                                                filteredLogs.map((item, index) => (
                                                    <React.Fragment key={item.id || index}>
                                                    <tr>
                                                        <td>{item.id.slice(0, 6).toUpperCase()}</td>
                                                        <td>{item.room}</td>
                                                        <td>{item.description}</td>
                                                        <td><span className={`badge ${item.priority === 'Urgent' ? 'bg-danger' : item.priority === 'High' ? 'bg-warning' : 'bg-info'}`}>{item.priority}</span></td>
                                                        <td>
                                                            <span className={`badge ${(item.status === 'Resolved' || item.status === 'Completed') ? 'bg-success' : item.status === 'In Progress' ? 'bg-warning text-dark' : item.status === 'Urgent' ? 'bg-danger' : 'bg-secondary'}`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td>{item.date}</td>
                                                        {isAdmin && (
                                                            <td>
                                                                {item.status !== 'Completed' && item.status !== 'Resolved' ? (
                                                                    <button 
                                                                        className="btn btn-sm btn-outline-success py-0"
                                                                        onClick={() => updateDoc(doc(db, 'maintenanceLogs', item.id), { status: 'Resolved' })}
                                                                    >
                                                                        Resolve
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-success small"><i className="bi bi-check-circle"></i> Resolved</span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                    {isUser && item.status === 'Resolved' && !item.feedback && (
                                                        <tr>
                                                            <td colSpan={isAdmin ? 7 : 6} className="p-0 border-0">
                                                                <div className="px-3 pb-2 pt-1 bg-light">
                                                                    <FeedbackForm logId={item.id} onSubmit={handleFeedbackSubmit} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {isUser && item.feedback && (
                                                        <tr>
                                                            <td colSpan={isAdmin ? 7 : 6} className="p-0 border-0">
                                                                <div className="px-3 pb-2 pt-1 bg-light text-success small">
                                                                    <i className="bi bi-check2-all me-1"></i> Feedback submitted: {item.feedback.rating}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <tr><td colSpan={6} className="text-center py-4">No logs found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceLogs;
