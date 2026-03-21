import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface EnergyErrors {
    roomId?: string;
    usageValue?: string;
    date?: string;
}

interface EnergyUsageFormProps {
    onSubmitSuccess?: (submittedAt: number) => void;
    userProfile?: any;
}

const EnergyUsageForm = ({ onSubmitSuccess, userProfile }: EnergyUsageFormProps) => {
    const [formData, setFormData] = useState({
        roomId: '',
        usageValue: '',
        date: ''
    });

    useEffect(() => {
        if (userProfile?.roomId && !formData.roomId) {
            setFormData(prev => ({ ...prev, roomId: userProfile.roomId }));
        }
    }, [userProfile?.roomId]);
    const [errors, setErrors] = useState<EnergyErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof EnergyErrors]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (): EnergyErrors => {
        const newErrors: EnergyErrors = {};
        if (!formData.roomId) newErrors.roomId = 'Room ID is required';
        else if (!/^\d+$/.test(formData.roomId)) newErrors.roomId = 'Room ID must be a valid number';

        if (!formData.usageValue) newErrors.usageValue = 'Usage Value is required';
        else if (isNaN(Number(formData.usageValue)) || Number(formData.usageValue) < 0 || Number(formData.usageValue) > 1000) {
            newErrors.usageValue = 'Usage must be between 0 and 1000 kWh';
        }
        if (!formData.date) newErrors.date = 'Date is required';
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
            await addDoc(collection(db, 'energyLogs'), {
                room: formData.roomId,
                usage: parseFloat(formData.usageValue),
                unit: 'kWh',
                date: formData.date,
                receivedAt: new Date().toISOString()
            });

            setSubmitStatus('success');
            setFormData({ roomId: '', usageValue: '', date: '' });
            onSubmitSuccess?.(submittedAt);

            setTimeout(() => setSubmitStatus('idle'), 3000);
        } catch (err) {
            console.error('Failed to submit energy usage:', err);
            setSubmitStatus('error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-success text-white">
                <h5 className="mb-0">Energy Usage Entry</h5>
            </div>
            <div className="card-body">
                {submitStatus === 'success' && (
                    <div className="alert alert-success py-2 mb-3">
                        ✅ Energy log saved! Dashboard updating…
                    </div>
                )}
                {submitStatus === 'error' && (
                    <div className="alert alert-danger py-2 mb-3">
                        ❌ Submission failed. Check the server.
                    </div>
                )}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                        <label htmlFor="roomId" className="form-label">Room ID</label>
                        <input
                            type="text"
                            className={`form-control ${errors.roomId ? 'is-invalid' : ''}`}
                            id="roomId"
                            name="roomId"
                            placeholder="e.g. 101"
                            value={formData.roomId}
                            onChange={handleChange}
                            required
                        />
                        {errors.roomId && <div className="invalid-feedback">{errors.roomId}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="usageValue" className="form-label">Usage (kWh)</label>
                        <input
                            type="number"
                            className={`form-control ${errors.usageValue ? 'is-invalid' : ''}`}
                            id="usageValue"
                            name="usageValue"
                            value={formData.usageValue}
                            onChange={handleChange}
                            step="0.1"
                            required
                        />
                        {errors.usageValue && <div className="invalid-feedback">{errors.usageValue}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="date" className="form-label">Date</label>
                        <input
                            type="date"
                            className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                            id="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                        />
                        {errors.date && <div className="invalid-feedback">{errors.date}</div>}
                    </div>
                    <button
                        type="submit"
                        className="btn btn-success w-100"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting…' : 'Submit Energy Usage'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EnergyUsageForm;
