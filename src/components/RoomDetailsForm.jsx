import { useState } from 'react';

const RoomDetailsForm = () => {
    const [formData, setFormData] = useState({
        roomNumber: '',
        roomType: '',
        capacity: ''
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.roomNumber) newErrors.roomNumber = 'Room Number is required';
        if (!formData.roomType) newErrors.roomType = 'Room Type is required';
        if (!formData.capacity) newErrors.capacity = 'Capacity is required';
        else if (isNaN(formData.capacity) || Number(formData.capacity) <= 0) newErrors.capacity = 'Capacity must be a positive number';
        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length === 0) {
            console.log('Room Details Submitted:', formData);
            alert('Room Details Submitted Successfully');
            setFormData({ roomNumber: '', roomType: '', capacity: '' });
        } else {
            setErrors(newErrors);
        }
    };

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Room Details Entry</h5>
            </div>
            <div className="card-body">
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
                    <button type="submit" className="btn btn-primary w-100">Submit Room Details</button>
                </form>
            </div>
        </div>
    );
};

export default RoomDetailsForm;
