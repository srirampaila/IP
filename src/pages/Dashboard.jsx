import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomDetailsForm from '../components/RoomDetailsForm';
import EnergyUsageForm from '../components/EnergyUsageForm';
import MaintenanceRequestForm from '../components/MaintenanceRequestForm';

const Dashboard = () => {
    const navigate = useNavigate();
    const [liveData, setLiveData] = useState({ maintenanceLogs: [], energyLogs: [], roomStatus: [], systemStatus: 'Loading...' });
    const [lastUpdated, setLastUpdated] = useState(null);

    // Filter/Sort State
    const [category, setCategory] = useState('maintenance'); // 'maintenance', 'energy', 'rooms'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('latest'); // 'latest', 'status'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/updates');
                const data = await response.json();
                setLiveData(data);
                setLastUpdated(new Date());
            } catch (error) {
                console.error('Error fetching updates:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => navigate('/');

    // Filtering and Sorting Logic
    const filteredData = useMemo(() => {
        let data = [];
        if (category === 'maintenance') data = liveData.maintenanceLogs || [];
        else if (category === 'energy') data = liveData.energyLogs || [];
        else if (category === 'rooms') data = liveData.roomStatus || [];

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(item => {
                if (category === 'maintenance') {
                    return item.room.toLowerCase().includes(query) ||
                        item.id.toLowerCase().includes(query) ||
                        item.description.toLowerCase().includes(query);
                } else if (category === 'energy') {
                    return item.room.toLowerCase().includes(query) ||
                        item.id.toLowerCase().includes(query);
                } else if (category === 'rooms') {
                    return item.roomNumber.toLowerCase().includes(query) ||
                        item.status.toLowerCase().includes(query);
                }
                return false;
            });
        }

        // Sort
        return [...data].sort((a, b) => {
            if (sortOption === 'latest') {
                // Assuming date or ID logic for latest
                return (b.date || b.id || '').localeCompare(a.date || a.id || '');
            } else if (sortOption === 'status') {
                const statA = a.status || '';
                const statB = b.status || '';
                return statA.localeCompare(statB);
            }
            return 0;
        });
    }, [liveData, category, searchQuery, sortOption]);

    return (
        <div className="container-fluid min-vh-100 bg-light">
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
                <div className="container">
                    <a className="navbar-brand" href="#">Building Management System</a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <button className="btn btn-outline-light me-2" onClick={() => navigate('/maintenance')}>Maintenance Logs</button>
                            </li>
                            <li className="nav-item">
                                <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="container">

                {/* Status Header */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card shadow-sm border-info">
                            <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">System Status: {liveData.systemStatus}</h5>
                                <small>Last Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Syncing...'}</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Controls */}
                <div className="row mb-4">
                    <div className="col-md-12">
                        <div className="card p-3">
                            <div className="row g-3 align-items-center">
                                <div className="col-md-4">
                                    <div className="btn-group w-100" role="group">
                                        <button type="button" className={`btn ${category === 'maintenance' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setCategory('maintenance')}>Maintenance</button>
                                        <button type="button" className={`btn ${category === 'energy' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setCategory('energy')}>Energy</button>
                                        <button type="button" className={`btn ${category === 'rooms' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setCategory('rooms')}>Rooms</button>
                                    </div>
                                </div>
                                <div className="col-md-5">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search (Room, ID, Description)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <select className="form-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                                        <option value="latest">Sort by Latest</option>
                                        <option value="status">Sort by Status</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="row mb-5">
                    <div className="col-12">
                        <div className="card shadow-sm">
                            <div className="card-header">
                                <h5 className="mb-0 text-capitalize">{category} Logs</h5>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                {category === 'maintenance' && <><th>ID</th><th>Room</th><th>Description</th><th>Priority</th><th>Status</th><th>Date</th></>}
                                                {category === 'energy' && <><th>ID</th><th>Room</th><th>Usage</th><th>Date</th></>}
                                                {category === 'rooms' && <><th>Room Number</th><th>Type</th><th>Status</th><th>Next Cleaning</th></>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.length > 0 ? (
                                                filteredData.map((item, index) => (
                                                    <tr key={index}>
                                                        {category === 'maintenance' && <>
                                                            <td>{item.id}</td>
                                                            <td>{item.room}</td>
                                                            <td>{item.description}</td>
                                                            <td><span className={`badge ${item.priority === 'Urgent' ? 'bg-danger' : item.priority === 'High' ? 'bg-warning' : 'bg-info'}`}>{item.priority}</span></td>
                                                            <td>{item.status}</td>
                                                            <td>{item.date}</td>
                                                        </>}
                                                        {category === 'energy' && <>
                                                            <td>{item.id}</td>
                                                            <td>{item.room}</td>
                                                            <td>{item.usage} {item.unit}</td>
                                                            <td>{item.date}</td>
                                                        </>}
                                                        {category === 'rooms' && <>
                                                            <td>{item.roomNumber}</td>
                                                            <td>{item.type}</td>
                                                            <td><span className={`badge ${item.status === 'Available' ? 'bg-success' : 'bg-secondary'}`}>{item.status}</span></td>
                                                            <td>{item.nextCleaning}</td>
                                                        </>}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="6" className="text-center">No records found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12 mb-4">
                        <h4 className="text-center text-dark">Data Entry Forms</h4>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-4">
                        <RoomDetailsForm />
                    </div>
                    <div className="col-md-4">
                        <EnergyUsageForm />
                    </div>
                    <div className="col-md-4">
                        <MaintenanceRequestForm />
                    </div>
                </div>
            </div>

            <footer className="footer mt-auto py-3 bg-light text-center">
                <div className="container">
                    <span className="text-muted">© 2024 Building Management System</span>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
