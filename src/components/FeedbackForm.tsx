import { useState } from 'react';

interface FeedbackFormProps {
    logId: string;
    onSubmit: (logId: string, rating: string, comments: string) => Promise<void>;
}

const FeedbackForm = ({ logId, onSubmit }: FeedbackFormProps) => {
    const [rating, setRating] = useState<string>('');
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating) {
            alert('Please provide a rating.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(logId, rating, comments);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="card border-info mt-2 mb-2 shadow-sm">
            <div className="card-header bg-info text-white py-2">
                <strong>Resolution Feedback</strong>
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Are you satisfied with the resolution?</label>
                        <div className="d-flex gap-3">
                            <div className="form-check">
                                <input 
                                    className="form-check-input" 
                                    type="radio" 
                                    name={`rating-${logId}`} 
                                    id={`satisfied-${logId}`} 
                                    value="Satisfied" 
                                    checked={rating === 'Satisfied'} 
                                    onChange={(e) => setRating(e.target.value)} 
                                />
                                <label className="form-check-label text-success" htmlFor={`satisfied-${logId}`}>
                                    <i className="bi bi-emoji-smile me-1"></i> Satisfied
                                </label>
                            </div>
                            <div className="form-check">
                                <input 
                                    className="form-check-input" 
                                    type="radio" 
                                    name={`rating-${logId}`} 
                                    id={`unsatisfied-${logId}`} 
                                    value="Unsatisfied" 
                                    checked={rating === 'Unsatisfied'} 
                                    onChange={(e) => setRating(e.target.value)} 
                                />
                                <label className="form-check-label text-danger" htmlFor={`unsatisfied-${logId}`}>
                                    <i className="bi bi-emoji-frown me-1"></i> Unsatisfied
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label htmlFor={`comments-${logId}`} className="form-label fw-semibold">Comments</label>
                        <textarea 
                            className="form-control" 
                            id={`comments-${logId}`} 
                            rows={2} 
                            placeholder="Tell us more about your experience..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        ></textarea>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting || !rating}>
                        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FeedbackForm;
