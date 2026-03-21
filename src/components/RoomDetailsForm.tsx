import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface RoomErrors {
    roomNumber?: string;
    roomType?: string;
    capacity?: string;
}

interface RoomDetailsFormProps {
    onSubmitSuccess?: (submittedAt: number) => void;
}

const RoomDetailsForm = ({ onSubmitSuccess }: RoomDetailsFormProps) => {
    const [formData, setFormData] = useState({
        roomNumber: '',
        roomType: '',
        capacity: ''
    });
    const [errors, setErrors] = useState<RoomErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof RoomErrors]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (): RoomErrors => {
        const newErrors: RoomErrors = {};
        if (!formData.roomNumber) newErrors.roomNumber = 'Room Number is required';
        if (!formData.roomType) newErrors.roomType = 'Room Type is required';
        if (!formData.capacity) newErrors.capacity = 'Capacity is required';
        else if (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0) newErrors.capacity = 'Capacity must be a positive number';
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
            await addDoc(collection(db, 'roomStatus'), {
                roomNumber: formData.roomNumber,
                type: formData.roomType,
                status: 'Available',
                nextCleaning: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                receivedAt: new Date().toISOString()
            });

            setSubmitStatus('success');
            setFormData({ roomNumber: '', roomType: '', capacity: '' });
            onSubmitSuccess?.(submittedAt);

            setTimeout(() => setSubmitStatus('idle'), 3000);
        } catch (err) {
            console.error('Failed to submit room details:', err);
            setSubmitStatus('error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Room Details Entry</h5>
            </div>
            <div className="card-body">
                {submitStatus === 'success' && (
                    <div className="alert alert-success py-2 mb-3">
                        ✅ Room saved! Dashboard updating…
                    </div>
                )}
                {submitStatus === 'error' && (
                    <div className="alert alert-danger py-2 mb-3">
                        ❌ Submission failed. Check the server.
                    </div>
                )}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                        <label htmlFor="roomNumber" className="form-label">Room Number</label>
                        <input
                            type="text"
                            className={`form-control ${errors.roomNumber ? 'is-invalid' : ''}`}
                            id="roomNumber"
                            name="roomNumber"
                            value={formData.roomNumber}
                            onChange={handleChange}
                            required
                        />
                        {errors.roomNumber && <div className="invalid-feedback">{errors.roomNumber}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="roomType" className="form-label">Room Type</label>
                        <select
                            className={`form-select ${errors.roomType ? 'is-invalid' : ''}`}
                            id="roomType"
                            name="roomType"
                            value={formData.roomType}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Type</option>
                            <option value="Single">Single</option>
                            <option value="Double">Double</option>
                            <option value="Suite">Suite</option>
                        </select>
                        {errors.roomType && <div className="invalid-feedback">{errors.roomType}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="capacity" className="form-label">Capacity</label>
                        <input
                            type="number"
                            className={`form-control ${errors.capacity ? 'is-invalid' : ''}`}
                            id="capacity"
                            name="capacity"
                            value={formData.capacity}
                            onChange={handleChange}
                            min="1"
                            required
                        />
                        {errors.capacity && <div className="invalid-feedback">{errors.capacity}</div>}
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting…' : 'Submit Room Details'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RoomDetailsForm;
