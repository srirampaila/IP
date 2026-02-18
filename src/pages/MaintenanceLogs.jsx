import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const MaintenanceLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('latest');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/updates');
                const data = await response.json();
                setLogs(data.maintenanceLogs || []);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching maintenance logs:', error);
                setLoading(false);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 15000);
        return () => clearInterval(interval);
    }, []);

    const filteredLogs = useMemo(() => {
        let data = logs;

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
                const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
                return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
            }
            return 0;
        });
    }, [logs, searchQuery, sortOption]);

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
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr>
                                            ) : filteredLogs.length > 0 ? (
                                                filteredLogs.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.id}</td>
                                                        <td>{item.room}</td>
                                                        <td>{item.description}</td>
                                                        <td><span className={`badge ${item.priority === 'Urgent' ? 'bg-danger' : item.priority === 'High' ? 'bg-warning' : 'bg-info'}`}>{item.priority}</span></td>
                                                        <td>{item.status}</td>
                                                        <td>{item.date}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="6" className="text-center py-4">No logs found</td></tr>
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
