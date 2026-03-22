import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import FeedbackForm from '../components/FeedbackForm';

import AdminFeedbackView from '../components/AdminFeedbackView';

import { Tab, Tabs, Dropdown } from 'react-bootstrap';
import { UserCircle, MessageSquare } from 'lucide-react';
import './Dashboard.css';
import RoomDetailsForm from '../components/RoomDetailsForm';
import EnergyUsageForm from '../components/EnergyUsageForm';
import MaintenanceRequestForm from '../components/MaintenanceRequestForm';
import VisitorLogForm from '../components/VisitorLogForm';
import SocialHub from '../components/social/SocialHub';

import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';

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

interface DashboardProps {
    defaultTab?: string;
}

const Dashboard = ({ defaultTab = 'maintenance' }: DashboardProps) => {
    const navigate = useNavigate();
    
    // Auth logic
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user?.role === 'admin';
    const isUser = user?.role === 'user';

    const [userProfile, setUserProfile] = useState<any>(null);

    const [liveData, setLiveData] = useState<LiveData>({
        maintenanceLogs: [],
        energyLogs: [],
        roomStatus: [],
        visitorLogs: [],
        systemStatus: 'Loading...'
    });

    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    // Filter/Sort State
    const [category, setCategory] = useState<string>(defaultTab);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortOption, setSortOption] = useState<string>('latest');



    // Firebase real-time listeners
    useEffect(() => {
        setLiveData(prev => ({ ...prev, systemStatus: 'Connected' }));

        let unsubUser = () => {};
        if (user?.id) {
            unsubUser = onSnapshot(doc(db, 'users', user.id), snap => {
                if (snap.exists()) setUserProfile({ id: snap.id, ...snap.data() });
            });
        }
        
        const qMaint = query(collection(db, 'maintenanceLogs'), orderBy('receivedAt', 'desc'));
        const unsubMaint = onSnapshot(qMaint, snap => {
            setLiveData(prev => ({ ...prev, maintenanceLogs: snap.docs.map(d => ({id: d.id, ...d.data()}) as any) }));
            setLastUpdatedAt(new Date());
        });

        const qEnergy = query(collection(db, 'energyLogs'), orderBy('receivedAt', 'desc'));
        const unsubEnergy = onSnapshot(qEnergy, snap => {
            setLiveData(prev => ({ ...prev, energyLogs: snap.docs.map(d => ({id: d.id, ...d.data()}) as any) }));
            setLastUpdatedAt(new Date());
        });

        const qRooms = query(collection(db, 'roomStatus'), orderBy('receivedAt', 'desc'));
        const unsubRooms = onSnapshot(qRooms, snap => {
            setLiveData(prev => ({ ...prev, roomStatus: snap.docs.map(d => ({id: d.id, ...d.data()}) as any) }));
            setLastUpdatedAt(new Date());
        });

        const qVisitors = query(collection(db, 'visitorLogs'), orderBy('entryTime', 'desc'));
        const unsubVisitors = onSnapshot(qVisitors, snap => {
            setLiveData(prev => ({ ...prev, visitorLogs: snap.docs.map(d => ({id: d.id, ...d.data()}) as any) }));
            setLastUpdatedAt(new Date());
        });

        return () => {
            unsubUser();
            unsubMaint();
            unsubEnergy();
            unsubRooms();
            unsubVisitors();
        };
    }, []);

    const handleSubmitSuccess = (_submittedAt: number) => {
        // No-op since Firebase handles UI updates instantly
    };

    const handleLogout = () => navigate('/');

    const handleResolve = async (id: string) => {
        try {
            await updateDoc(doc(db, 'maintenanceLogs', id), { status: 'Resolved' });
        } catch (error) {
            console.error('Error resolving request:', error);
        }
    };

    const handleFeedbackSubmit = async (logId: string, rating: string, comments: string) => {
        try {
            await updateDoc(doc(db, 'maintenanceLogs', logId), {
                feedback: { rating, comments }
            });
        } catch (error) {
            console.error('Error submitting feedback:', error);
            throw error; // Let the form handle the alert
        }
    };

    // Filtering and Sorting Logic
    const filteredData = useMemo(() => {
        let data: any[] = [];
        if (category === 'maintenance') data = liveData.maintenanceLogs || [];
        else if (category === 'energy') data = liveData.energyLogs || [];
        else if (category === 'rooms') data = liveData.roomStatus || [];
        else if (category === 'visitors') data = liveData.visitorLogs || [];

        // Apply RBAC filtering for users
        if (isUser && (category === 'maintenance' || category === 'energy')) {
            data = data.filter((item: any) => item.room === user.roomId);
        }

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
                                <Dropdown align="end">
                                    <Dropdown.Toggle variant="outline-light" id="dropdown-profile" className="d-flex align-items-center gap-2 px-3 py-2 border-0 shadow-none">
                                        <UserCircle size={20} />
                                        <span className="d-none d-md-inline fw-semibold">{userProfile?.fullName || 'My Profile'}</span>
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className="shadow border-0 mt-2" style={{ minWidth: '200px' }}>
                                        <div className="px-3 py-2 mb-2 bg-light border-bottom">
                                            <div className="fw-bold">{userProfile?.fullName || user?.name || 'Hello!'}</div>
                                            <div className="small text-muted text-capitalize">{user?.role}</div>
                                        </div>
                                        <Dropdown.Item onClick={() => navigate('/profile')} className="d-flex align-items-center gap-2 py-2">
                                            <UserCircle size={16} /> Edit Profile
                                        </Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={handleLogout} className="text-danger d-flex align-items-center gap-2 py-2">
                                            Logout
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
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

                    </div>
                </div>

                {/* User Notification Status Card for Resolved Maintenance Requests */}
                {isUser && liveData.maintenanceLogs.some(log => log.room === user?.roomId && log.status === 'Resolved' && !(log as any).feedback) && (
                    <div className="alert alert-success mt-3 mb-4 shadow-sm border-0 border-start border-5 border-success" role="alert">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-check-circle-fill me-3 fs-3"></i>
                            <div>
                                <h5 className="alert-heading mb-1">Feedback Required</h5>
                                <p className="mb-0">Your problem has been solved! Please check the resolution in the <strong>Maintenance Logs</strong>. If any issues remain, please raise a new request, or submit feedback to close the current one.</p>
                            </div>
                        </div>
                    </div>
                )}

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
                                                                <th>ID</th><th>Room</th><th>Description</th><th>Priority</th><th>Status</th><th>Date</th>{isAdmin && <th>Action</th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredData.length > 0 ? (
                                                                filteredData.map((item: any, index) => (
                                                                    <React.Fragment key={item.id || index}>
                                                                    <tr className={item.isNew ? 'row-flash' : ''}>
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
                                                                                {item.status !== 'Completed' && item.status !== 'Resolved' && (
                                                                                    <button 
                                                                                        className="btn btn-sm btn-outline-success py-0"
                                                                                        onClick={() => handleResolve(item.id)}
                                                                                    >
                                                                                        Resolve
                                                                                    </button>
                                                                                )}
                                                                                {(item.status === 'Completed' || item.status === 'Resolved') && <span className="text-success small"><i className="bi bi-check-circle"></i> Resolved</span>}
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
                                                                <tr><td colSpan={6} className="text-center">No logs found</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <MaintenanceRequestForm onSubmitSuccess={handleSubmitSuccess} userProfile={userProfile} />
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
                                        <EnergyUsageForm onSubmitSuccess={handleSubmitSuccess} userProfile={userProfile} />
                                    </div>
                                </div>
                            </Tab>

                            {/* ── Room Status Tab ── */}
                            {isAdmin && (
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
                            )}

                            {/* ── Visitor Logs Tab ── */}
                            {isAdmin && (
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
                            )}

                            {/* ── Social Hub Tab ── */}
                            <Tab eventKey="social" title="Community Hub">
                                <SocialHub />
                            </Tab>

                            {/* ── Admin Feedback Tab ── */}
                            {isAdmin && (
                            <Tab eventKey="feedback" title={<><MessageSquare size={16} className="me-2 mb-1" />User Feedback</>}>
                                <AdminFeedbackView />
                            </Tab>
                            )}
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
