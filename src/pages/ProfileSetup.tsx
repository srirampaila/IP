import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ProfileSetup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        roomId: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // If no user is logged in, send them to login
        if (!auth.currentUser) {
            navigate('/');
        }
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const user = auth.currentUser;
        if (!user) {
            setError('No authenticated user found.');
            setLoading(false);
            return;
        }

        try {
            // Merge the new profile data into the existing user document (which already contains the 'role')
            await setDoc(doc(db, 'users', user.uid), {
                fullName: formData.fullName,
                roomId: formData.roomId,
                phone: formData.phone,
                profileCompleted: true
            }, { merge: true });

            navigate('/dashboard');
        } catch (err: any) {
            console.error('Error saving profile:', err);
            setError(err.message || 'Failed to save profile setup.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center min-vh-100 bg-light">
            <div className="card shadow-lg border-0 rounded-4 p-4" style={{ maxWidth: '500px', width: '100%' }}>
                <h2 className="text-center mb-4 fw-bold text-primary">Complete Your Profile</h2>
                <p className="text-center text-muted mb-4">Tell us a little about yourself before entering the dashboard.</p>
                
                {error && <div className="alert alert-danger">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label text-muted fw-semibold">Full Name</label>
                        <input
                            type="text"
                            name="fullName"
                            className="form-control"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="mb-3">
                        <label className="form-label text-muted fw-semibold">Room ID</label>
                        <input
                            type="text"
                            name="roomId"
                            className="form-control"
                            placeholder="e.g. 101"
                            value={formData.roomId}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="form-label text-muted fw-semibold">Phone Number</label>
                        <input
                            type="tel"
                            name="phone"
                            className="form-control"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={loading}>
                        {loading ? 'Saving...' : 'Enter Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSetup;
