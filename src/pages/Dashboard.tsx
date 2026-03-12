import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tab, Tabs } from 'react-bootstrap';
import './Dashboard.css';
import RoomDetailsForm from '../components/RoomDetailsForm';
import EnergyUsageForm from '../components/EnergyUsageForm';
import MaintenanceRequestForm from '../components/MaintenanceRequestForm';
import VisitorLogForm from '../components/VisitorLogForm';
import SocialHub from '../components/social/SocialHub';

const POLL_INTERVAL_MS = 15000; // 15 seconds

interface MaintenanceLog {
    id: string;
    room: string;
    description: string;
    priority: string;
    status: string;
    date: string;
    isNew?: boolean;
}

interface EnergyLog {
    id: string;
    room: string;
    usage: number;
    unit: string;
    date: string;
    isNew?: boolean;
}

interface RoomStatus {
    roomNumber: string;
    type: string;
    status: string;
    nextCleaning: string;
    isNew?: boolean;
}

interface VisitorLog {
    id: string;
    name: string;
    purpose: string;
    entryTime: string;
    isNew?: boolean;
}

interface LiveData {
    maintenanceLogs: MaintenanceLog[];
    energyLogs: EnergyLog[];
    roomStatus: RoomStatus[];
    visitorLogs: VisitorLog[];
    systemStatus: string;
    serverTime?: string;
}

const Dashboard = () => {
    const navigate = useNavigate();

    const [liveData, setLiveData] = useState<LiveData>({
        maintenanceLogs: [],
        energyLogs: [],
        roomStatus: [],
        visitorLogs: [],
        systemStatus: 'Loading...'
    });

    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const [countdown, setCountdown] = useState<number>(POLL_INTERVAL_MS / 1000);
    const [isPolling, setIsPolling] = useState(false);

    // Filter/Sort State
    const [category, setCategory] = useState<string>('maintenance');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortOption, setSortOption] = useState<string>('latest');

    // Ref so fetchData can be called imperatively without recreating the interval
    const lastSubmitTimeRef = useRef<number | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const resetCountdown = useCallback(() => {
        setCountdown(POLL_INTERVAL_MS / 1000);
    }, []);

    const fetchData = useCallback(async () => {
        setIsPolling(true);
        try {
            const response = await fetch('http://localhost:3001/api/updates');
            const data: LiveData = await response.json();
            const now = Date.now();

            setLiveData(data);
            setLastUpdatedAt(new Date(now));

            // Compute latency if this fetch was triggered by a form submit
            if (lastSubmitTimeRef.current !== null) {
                setLatencyMs(now - lastSubmitTimeRef.current);
                lastSubmitTimeRef.current = null;
            }

            resetCountdown();
        } catch (error) {
            console.error('Error fetching updates:', error);
        } finally {
            setIsPolling(false);
        }
    }, [resetCountdown]);

    // Polling interval
    useEffect(() => {
        fetchData();
        const pollInterval = setInterval(fetchData, POLL_INTERVAL_MS);
        return () => clearInterval(pollInterval);
    }, [fetchData]);

    // Countdown timer (ticks every second)
    useEffect(() => {
        countdownRef.current = setInterval(() => {
            setCountdown(prev => (prev > 1 ? prev - 1 : POLL_INTERVAL_MS / 1000));
        }, 1000);
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    // Called by forms after successful submission
    const handleSubmitSuccess = useCallback((submittedAt: number) => {
        lastSubmitTimeRef.current = submittedAt;
        // Slight delay to let the server process, then immediately poll
        setTimeout(() => fetchData(), 300);
    }, [fetchData]);

    const handleLogout = () => navigate('/');

    // Filtering and Sorting Logic
    const filteredData = useMemo(() => {
        let data: any[] = [];
        if (category === 'maintenance') data = liveData.maintenanceLogs || [];
        else if (category === 'energy') data = liveData.energyLogs || [];
        else if (category === 'rooms') data = liveData.roomStatus || [];
        else if (category === 'visitors') data = liveData.visitorLogs || [];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter((item: any) => {
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
                } else if (category === 'visitors') {
                    return item.name.toLowerCase().includes(query) ||
                        item.purpose.toLowerCase().includes(query);
                }
                return false;
            });
        }

        return [...data].sort((a: any, b: any) => {
            if (sortOption === 'latest') {
                return (b.date || b.entryTime || b.id || '').localeCompare(a.date || a.entryTime || a.id || '');
            } else if (sortOption === 'status') {
                return (a.status || '').localeCompare(b.status || '');
            }
            return 0;
        });
    }, [liveData, category, searchQuery, sortOption]);

    const formatTime = (date: Date) =>
        date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
                                <button className="btn btn-outline-light me-2" onClick={() => navigate('/maintenance')}>View Maintenance Logs</button>
                            </li>
                            <li className="nav-item">
                                <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <div className="container">

                {/* ── Live Status Bar ── */}
                <div className="status-bar card shadow-sm mb-4">
                    <div className="card-body py-2 px-3 d-flex flex-wrap align-items-center gap-3">
                        {/* LIVE badge */}
                        <span className="live-badge">
                            <span className="live-dot" />
                            LIVE
                        </span>

                        {/* System status */}
                        <span className="text-muted small">
                            <strong>System:</strong>{' '}
                            <span className="text-success fw-semibold">{liveData.systemStatus}</span>
                        </span>

                        {/* Last updated */}
                        {lastUpdatedAt && (
                            <span className="text-muted small">
                                <strong>Last updated:</strong> {formatTime(lastUpdatedAt)}
                            </span>
                        )}

                        {/* Next refresh countdown */}
                        <span className="text-muted small">
                            <strong>Next refresh in:</strong>{' '}
                            <span className={`fw-semibold ${countdown <= 3 ? 'text-warning' : 'text-primary'}`}>
                                {countdown}s
                            </span>
                        </span>

                        {/* Update latency */}
                        {latencyMs !== null && (
                            <span className="text-muted small latency-badge">
                                ⚡ <strong>Last update latency:</strong>{' '}
                                <span className="fw-semibold text-success">{latencyMs} ms</span>
                            </span>
                        )}

                        {/* Polling spinner */}
                        {isPolling && (
                            <span className="text-muted small">
                                <span className="spinner-border spinner-border-sm text-primary me-1" role="status" aria-hidden="true"></span>
                                Fetching…
                            </span>
                        )}
                    </div>
                </div>

                {/* Tabs for Content */}
                <div className="row mt-4">
                    <div className="col-12">
                        <Tabs
                            id="dashboard-tabs"
                            activeKey={category}
                            onSelect={(k) => k && setCategory(k)}
                            className="mb-3"
                        >
                            {/* ── Maintenance Tab ── */}
                            <Tab eventKey="maintenance" title="Maintenance">
                                <div className="row">
                                    <div className="col-md-8 mb-4">
                                        <div className="card shadow-sm">
                                            <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <h5 className="mb-0">Maintenance Logs</h5>
                                                <div className="d-flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Search..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        style={{ maxWidth: '200px' }}
                                                    />
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={sortOption}
                                                        onChange={(e) => setSortOption(e.target.value)}
                                                        style={{ maxWidth: '150px' }}
                                                    >
                                                        <option value="latest">Latest</option>
                                                        <option value="status">Status</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="card-body p-0">
                                                <div className="table-responsive">
                                                    <table className="table table-hover mb-0">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>ID</th><th>Room</th><th>Description</th><th>Priority</th><th>Status</th><th>Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredData.length > 0 ? (
                                                                filteredData.map((item: any, index) => (
                                                                    <tr key={index} className={item.isNew ? 'row-flash' : ''}>
                                                                        <td>{item.id}</td>
                                                                        <td>{item.room}</td>
                                                                        <td>{item.description}</td>
                                                                        <td><span className={`badge ${item.priority === 'Urgent' ? 'bg-danger' : item.priority === 'High' ? 'bg-warning' : 'bg-info'}`}>{item.priority}</span></td>
                                                                        <td>
                                                                            <span className={`badge ${item.status === 'Completed' ? 'bg-success' : item.status === 'In Progress' ? 'bg-warning text-dark' : item.status === 'Urgent' ? 'bg-danger' : 'bg-secondary'}`}>
                                                                                {item.status}
                                                                            </span>
                                                                        </td>
                                                                        <td>{item.date}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr><td colSpan={6} className="text-center">No logs found</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <MaintenanceRequestForm onSubmitSuccess={handleSubmitSuccess} />
                                    </div>
                                </div>
                            </Tab>

                            {/* ── Energy Usage Tab ── */}
                            <Tab eventKey="energy" title="Energy Usage">
                                <div className="row">
                                    <div className="col-md-8 mb-4">
                                        <div className="card shadow-sm">
                                            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <h5 className="mb-0">Energy Logs</h5>
                                                <div className="d-flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Search..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        style={{ maxWidth: '200px' }}
                                                    />
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={sortOption}
                                                        onChange={(e) => setSortOption(e.target.value)}
                                                        style={{ maxWidth: '150px' }}
                                                    >
                                                        <option value="latest">Latest</option>
                                                        <option value="status">Status</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="card-body p-0">
                                                <div className="table-responsive">
                                                    <table className="table table-hover mb-0">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>ID</th><th>Room</th><th>Usage</th><th>Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredData.length > 0 ? (
                                                                filteredData.map((item: any, index) => (
                                                                    <tr key={index} className={item.isNew ? 'row-flash' : ''}>
                                                                        <td>{item.id}</td>
                                                                        <td>{item.room}</td>
                                                                        <td>{item.usage} {item.unit}</td>
                                                                        <td>{item.date}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr><td colSpan={4} className="text-center">No logs found</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <EnergyUsageForm onSubmitSuccess={handleSubmitSuccess} />
                                    </div>
                                </div>
                            </Tab>

                            {/* ── Room Status Tab ── */}
                            <Tab eventKey="rooms" title="Room Status">
                                <div className="row">
                                    <div className="col-md-8 mb-4">
                                        <div className="card shadow-sm">
                                            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <h5 className="mb-0">Room Status</h5>
                                                <div className="d-flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Search..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        style={{ maxWidth: '200px' }}
                                                    />
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={sortOption}
                                                        onChange={(e) => setSortOption(e.target.value)}
                                                        style={{ maxWidth: '150px' }}
                                                    >
                                                        <option value="latest">Latest</option>
                                                        <option value="status">Status</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="card-body p-0">
                                                <div className="table-responsive">
                                                    <table className="table table-hover mb-0">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>Room Number</th><th>Type</th><th>Status</th><th>Next Cleaning</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredData.length > 0 ? (
                                                                filteredData.map((item: any, index) => (
                                                                    <tr key={index} className={item.isNew ? 'row-flash' : ''}>
                                                                        <td>{item.roomNumber}</td>
                                                                        <td>{item.type}</td>
                                                                        <td>
                                                                            <span className={`badge ${item.status === 'Available' ? 'bg-success' : item.status === 'Maintenance' ? 'bg-danger' : item.status === 'Cleaning' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                                                                {item.status}
                                                                            </span>
                                                                        </td>
                                                                        <td>{item.nextCleaning}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr><td colSpan={4} className="text-center">No rooms found</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <RoomDetailsForm onSubmitSuccess={handleSubmitSuccess} />
                                    </div>
                                </div>
                            </Tab>

                            {/* ── Visitor Logs Tab ── */}
                            <Tab eventKey="visitors" title="Visitor Logs">
                                <div className="row">
                                    <div className="col-md-8 mb-4">
                                        <div className="card shadow-sm">
                                            <div className="card-header bg-info text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <h5 className="mb-0">Visitor Logs</h5>
                                                <div className="d-flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Search visitors..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        style={{ maxWidth: '200px' }}
                                                    />
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={sortOption}
                                                        onChange={(e) => setSortOption(e.target.value)}
                                                        style={{ maxWidth: '150px' }}
                                                    >
                                                        <option value="latest">Latest First</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="card-body p-0">
                                                <div className="table-responsive">
                                                    <table className="table table-hover mb-0">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>Visitor Name</th><th>Purpose of Visit</th><th>Entry Time</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredData.length > 0 ? (
                                                                filteredData.map((item: any, index) => (
                                                                    <tr key={index} className={item.isNew ? 'row-flash' : ''}>
                                                                        <td className="fw-semibold">{item.name}</td>
                                                                        <td>{item.purpose}</td>
                                                                        <td className="text-muted">{new Date(item.entryTime).toLocaleString('en-IN')}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr><td colSpan={3} className="text-center py-4 text-muted">No visitors logged</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <VisitorLogForm onSubmitSuccess={handleSubmitSuccess} />
                                    </div>
                                </div>
                            </Tab>

                            {/* ── Social Hub Tab ── */}
                            <Tab eventKey="social" title="Community Hub">
                                <SocialHub />
                            </Tab>
                        </Tabs>
                    </div>
                </div>
            </div>

            <footer className="footer mt-auto py-3 bg-light text-center">
                <div className="container">
                    <span className="text-muted">Building Management System</span>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
