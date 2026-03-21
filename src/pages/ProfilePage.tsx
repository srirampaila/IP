import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft, Camera } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [profileData, setProfileData] = useState({
        fullName: '',
        roomId: '',
        phone: '',
        role: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate('/');
                return;
            }

            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfileData({
                        fullName: docSnap.data().fullName || '',
                        roomId: docSnap.data().roomId || '',
                        phone: docSnap.data().phone || '',
                        role: docSnap.data().role || 'user'
                    });
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                fullName: profileData.fullName,
                roomId: profileData.roomId,
                phone: profileData.phone
            });
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating profile:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
                <div className="spinner-border text-primary" role="status"></div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 bg-light py-5">
            <div className="container">
                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="btn btn-link text-decoration-none text-muted mb-4 d-flex align-items-center gap-2"
                >
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>

                <div className="row justify-content-center">
                    <div className="col-md-8 col-lg-6">
                        <div className="card shadow-sm border-0 rounded-4">
                            <div className="card-body p-4 p-md-5">
                                <div className="text-center mb-5">
                                    <div className="position-relative d-inline-block mb-3">
                                        <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '100px', height: '100px' }}>
                                            <User size={48} className="text-primary" />
                                        </div>
                                        <button className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 shadow-sm" style={{ width: '32px', height: '32px', padding: 0 }}>
                                            <Camera size={16} />
                                        </button>
                                    </div>
                                    <h3 className="fw-bold mb-1">{profileData.fullName || 'User Profile'}</h3>
                                    <span className="badge bg-secondary text-capitalize">{profileData.role}</span>
                                </div>

                                <div className="vstack gap-4">
                                    {/* Full Name */}
                                    <div>
                                        <label className="form-label text-muted small fw-semibold text-uppercase mb-1">Full Name</label>
                                        {isEditing ? (
                                            <input type="text" name="fullName" className="form-control" value={profileData.fullName} onChange={handleChange} />
                                        ) : (
                                            <div className="fs-5">{profileData.fullName || <span className="text-muted fst-italic">Not set</span>}</div>
                                        )}
                                    </div>

                                    {/* Room ID */}
                                    <div>
                                        <label className="form-label text-muted small fw-semibold text-uppercase mb-1">Room ID</label>
                                        {isEditing ? (
                                            <input type="text" name="roomId" className="form-control" value={profileData.roomId} onChange={handleChange} />
                                        ) : (
                                            <div className="fs-5">{profileData.roomId || <span className="text-muted fst-italic">Not set</span>}</div>
                                        )}
                                    </div>

                                    {/* Phone Number */}
                                    <div>
                                        <label className="form-label text-muted small fw-semibold text-uppercase mb-1">Phone Number</label>
                                        {isEditing ? (
                                            <input type="tel" name="phone" className="form-control" value={profileData.phone} onChange={handleChange} />
                                        ) : (
                                            <div className="fs-5">{profileData.phone || <span className="text-muted fst-italic">Not set</span>}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5 pt-3 border-top d-flex gap-3">
                                    {isEditing ? (
                                        <>
                                            <button className="btn btn-outline-secondary flex-grow-1" onClick={() => setIsEditing(false)} disabled={saving}>Cancel</button>
                                            <button className="btn btn-primary flex-grow-1" onClick={handleSave} disabled={saving}>
                                                {saving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </>
                                    ) : (
                                        <button className="btn btn-primary w-100" onClick={() => setIsEditing(true)}>
                                            Edit Profile
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
