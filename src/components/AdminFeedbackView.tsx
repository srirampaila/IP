import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface FeedbackLog {
    id: string;
    room: string;
    description: string;
    date: string;
    feedback: {
        rating: string;
        comments: string;
    };
}

const AdminFeedbackView = () => {
    const [feedbackLogs, setFeedbackLogs] = useState<FeedbackLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'maintenanceLogs'), orderBy('receivedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs
                .map(doc => ({ ...doc.data() as any, id: doc.id }))
                .filter(log => log.feedback);
            setFeedbackLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching feedback logs:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredLogs = useMemo(() => {
        if (!searchQuery) return feedbackLogs;
        const lowerQ = searchQuery.toLowerCase();
        return feedbackLogs.filter(item => 
            item.room.toLowerCase().includes(lowerQ) ||
            item.description.toLowerCase().includes(lowerQ) ||
            item.feedback.rating.toLowerCase().includes(lowerQ) ||
            item.feedback.comments.toLowerCase().includes(lowerQ)
        );
    }, [feedbackLogs, searchQuery]);

    return (
        <div className="row">
            <div className="col-12 mb-4">
                <div className="card shadow-sm border-0 border-top border-4 border-primary">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
                        <h5 className="mb-0 fw-bold text-dark"><i className="bi bi-chat-square-quote text-primary me-2"></i> User Feedback</h5>
                        <div className="d-flex gap-2">
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Search feedback..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ maxWidth: '250px' }}
                            />
                        </div>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle table-borderless table-striped">
                                <thead className="table-light border-bottom">
                                    <tr>
                                        <th className="px-4 py-3 text-muted fw-semibold">Location</th>
                                        <th className="px-4 py-3 text-muted fw-semibold" style={{ maxWidth: '300px' }}>Resolution For</th>
                                        <th className="px-4 py-3 text-muted fw-semibold text-center">Satisfaction</th>
                                        <th className="px-4 py-3 text-muted fw-semibold">User Comments</th>
                                        <th className="px-4 py-3 text-muted fw-semibold">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} className="text-center py-5 text-muted"><div className="spinner-border spinner-border-sm me-2 text-primary" role="status"></div> Loading feedback...</td></tr>
                                    ) : filteredLogs.length > 0 ? (
                                        filteredLogs.map((item, index) => (
                                            <tr key={index} className="border-bottom">
                                                <td className="px-4 fw-bold text-dark">{item.room}</td>
                                                <td className="px-4 text-truncate text-secondary" style={{ maxWidth: '300px' }} title={item.description}>
                                                    {item.description}
                                                </td>
                                                <td className="px-4 text-center">
                                                    {item.feedback.rating === 'Satisfied' ? (
                                                        <span className="badge bg-success bg-opacity-10 text-success border border-success d-inline-flex align-items-center gap-1 py-2 px-3 rounded-pill fw-semibold shadow-sm transition-all hover-scale" style={{ transition: 'transform 0.2s', cursor: 'default' }}>
                                                            <i className="bi bi-emoji-smile-fill fs-6"></i> Satisfied
                                                        </span>
                                                    ) : item.feedback.rating === 'Unsatisfied' ? (
                                                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger d-inline-flex align-items-center gap-1 py-2 px-3 rounded-pill fw-semibold shadow-sm transition-all hover-scale" style={{ transition: 'transform 0.2s', cursor: 'default' }}>
                                                            <i className="bi bi-emoji-frown-fill fs-6"></i> Unsatisfied
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-secondary rounded-pill py-2 px-3">{item.feedback.rating}</span>
                                                    )}
                                                </td>
                                                <td className="px-4">
                                                    {item.feedback.comments ? (
                                                        <span className="fst-italic text-dark px-3 py-2 bg-light rounded d-inline-block border">"{item.feedback.comments}"</span>
                                                    ) : (
                                                        <span className="text-muted small px-3 py-2 bg-light rounded d-inline-block border">No comments provided</span>
                                                    )}
                                                </td>
                                                <td className="px-4 text-muted small"><i className="bi bi-clock me-1"></i> {item.date}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className="text-center py-5 text-muted">
                                            <div className="d-flex flex-column align-items-center gap-2">
                                                <i className="bi bi-inbox fs-1 text-light"></i>
                                                <span>No feedback received yet.</span>
                                            </div>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminFeedbackView;
