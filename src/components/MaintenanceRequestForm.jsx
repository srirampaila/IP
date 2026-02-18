import { useState } from 'react';

const MaintenanceRequestForm = () => {
    const [formData, setFormData] = useState({
        roomId: '',
        description: '',
        priority: ''
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
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.priority) newErrors.priority = 'Priority is required';
        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length === 0) {
            console.log('Maintenance Request Submitted:', formData);
            alert('Maintenance Request Submitted Successfully');
            setFormData({ roomId: '', description: '', priority: '' });
        } else {
            setErrors(newErrors);
        }
    };

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-danger text-white">
                <h5 className="mb-0">Maintenance Request</h5>
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                        <label htmlFor="mRoomId" className="form-label">Room ID</label>
                        <input
                            type="text"
                            className={`form-control ${errors.roomId ? 'is-invalid' : ''}`}
                            id="mRoomId"
                            name="roomId"
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
                            rows="3"
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
                    <button type="submit" className="btn btn-danger w-100">Submit Request</button>
                </form>
            </div>
        </div>
    );
};

export default MaintenanceRequestForm;
