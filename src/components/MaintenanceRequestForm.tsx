import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';


interface MaintenanceErrors {
    roomId?: string;
    description?: string;
    priority?: string;
}

interface MaintenanceRequestFormProps {
    onSubmitSuccess?: (submittedAt: number) => void;
    userProfile?: any;
}

const MaintenanceRequestForm = ({ onSubmitSuccess, userProfile }: MaintenanceRequestFormProps) => {
    const [formData, setFormData] = useState({
        roomId: '',
        description: '',
        priority: ''
    });

    useEffect(() => {
        if (userProfile?.roomId && !formData.roomId) {
            setFormData(prev => ({ ...prev, roomId: userProfile.roomId }));
        }
    }, [userProfile?.roomId]);
    const [errors, setErrors] = useState<MaintenanceErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof MaintenanceErrors]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (): MaintenanceErrors => {
        const newErrors: MaintenanceErrors = {};
        if (!formData.roomId) newErrors.roomId = 'Room ID is required';
        else if (!/^\d+$/.test(formData.roomId)) newErrors.roomId = 'Room ID must be a valid number';
        
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.priority) newErrors.priority = 'Priority is required';
        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const submittedAt = Date.now();
        setSubmitting(true);
        setSubmitStatus('idle');

        try {
            await addDoc(collection(db, 'maintenanceLogs'), {
                room: formData.roomId,
                description: formData.description,
                priority: formData.priority,
                status: 'Pending',
                date: new Date().toISOString().split('T')[0],
                receivedAt: new Date().toISOString()
            });

            setSubmitStatus('success');
            setFormData({ roomId: '', description: '', priority: '' });
            onSubmitSuccess?.(submittedAt);

            setTimeout(() => setSubmitStatus('idle'), 3000);
        } catch (err) {
            console.error('Failed to submit maintenance request:', err);
            setSubmitStatus('error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-danger text-white">
                <h5 className="mb-0">Maintenance Request</h5>
            </div>
            <div className="card-body">
                {submitStatus === 'success' && (
                    <div className="alert alert-success py-2 mb-3">
                        ✅ Request submitted! Dashboard updating…
                    </div>
                )}
                {submitStatus === 'error' && (
                    <div className="alert alert-danger py-2 mb-3">
                        ❌ Submission failed. Check the server.
                    </div>
                )}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                        <label htmlFor="mRoomId" className="form-label">Room ID</label>
                        <input
                            type="text"
                            className={`form-control ${errors.roomId ? 'is-invalid' : ''}`}
                            id="mRoomId"
                            name="roomId"
                            placeholder="e.g. 101"
                            value={formData.roomId}
                            onChange={handleChange}
                            required
                        />
                        {errors.roomId && <div className="invalid-feedback">{errors.roomId}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="description" className="form-label">Issue Description</label>
                        <textarea
                            className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                            id="description"
                            name="description"
                            rows={3}
                            value={formData.description}
                            onChange={handleChange}
                            required
                        ></textarea>
                        {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="priority" className="form-label">Priority</label>
                        <select
                            className={`form-select ${errors.priority ? 'is-invalid' : ''}`}
                            id="priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                        {errors.priority && <div className="invalid-feedback">{errors.priority}</div>}
                    </div>
                    <button
                        type="submit"
                        className="btn btn-danger w-100"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting…' : 'Submit Request'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MaintenanceRequestForm;
