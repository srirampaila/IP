import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface VisitorErrors {
    name?: string;
    purpose?: string;
}

interface VisitorLogFormProps {
    onSubmitSuccess?: (submittedAt: number) => void;
}

const VisitorLogForm = ({ onSubmitSuccess }: VisitorLogFormProps) => {
    const [formData, setFormData] = useState({
        name: '',
        purpose: ''
    });
    const [errors, setErrors] = useState<VisitorErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof VisitorErrors]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (): VisitorErrors => {
        const newErrors: VisitorErrors = {};
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.purpose) newErrors.purpose = 'Purpose is required';
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
            await addDoc(collection(db, 'visitorLogs'), {
                name: formData.name,
                purpose: formData.purpose,
                entryTime: new Date().toISOString()
            });

            setSubmitStatus('success');
            setFormData({ name: '', purpose: '' });
            onSubmitSuccess?.(submittedAt);

            setTimeout(() => setSubmitStatus('idle'), 3000);
        } catch (err) {
            console.error('Failed to submit visitor log:', err);
            setSubmitStatus('error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
                <h5 className="mb-0">Log a Visitor</h5>
            </div>
            <div className="card-body">
                {submitStatus === 'success' && (
                    <div className="alert alert-success py-2 mb-3">
                        ✅ Visitor logged! Dashboard updating…
                    </div>
                )}
                {submitStatus === 'error' && (
                    <div className="alert alert-danger py-2 mb-3">
                        ❌ Submission failed. Check the server.
                    </div>
                )}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                        <label htmlFor="vName" className="form-label">Visitor Name</label>
                        <input
                            type="text"
                            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                            id="vName"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="vPurpose" className="form-label">Purpose of Visit</label>
                        <textarea
                            className={`form-control ${errors.purpose ? 'is-invalid' : ''}`}
                            id="vPurpose"
                            name="purpose"
                            rows={3}
                            value={formData.purpose}
                            onChange={handleChange}
                            required
                        ></textarea>
                        {errors.purpose && <div className="invalid-feedback">{errors.purpose}</div>}
                    </div>
                    <button
                        type="submit"
                        className="btn btn-info text-white w-100"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting…' : 'Log Visitor'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VisitorLogForm;
