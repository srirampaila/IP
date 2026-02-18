import { useState } from 'react';

const EnergyUsageForm = () => {
    const [formData, setFormData] = useState({
        roomId: '',
        usageValue: '',
        date: ''
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.roomId) newErrors.roomId = 'Room ID is required';
        if (!formData.usageValue) newErrors.usageValue = 'Usage Value is required';
        else if (isNaN(formData.usageValue) || Number(formData.usageValue) < 0 || Number(formData.usageValue) > 1000) {
            newErrors.usageValue = 'Usage must be between 0 and 1000 kWh';
        }
        if (!formData.date) newErrors.date = 'Date is required';
        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length === 0) {
            console.log('Energy Usage Submitted:', formData);
            alert('Energy Usage Recorded Successfully');
            setFormData({ roomId: '', usageValue: '', date: '' });
        } else {
            setErrors(newErrors);
        }
    };

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-success text-white">
                <h5 className="mb-0">Energy Usage Entry</h5>
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                        <label htmlFor="roomId" className="form-label">Room ID</label>
                        <input
                            type="text"
                            className={`form-control ${errors.roomId ? 'is-invalid' : ''}`}
                            id="roomId"
                            name="roomId"
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
                    <button type="submit" className="btn btn-success w-100">Submit Energy Usage</button>
                </form>
            </div>
        </div>
    );
};

export default EnergyUsageForm;
