import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, ShieldCheck, UserCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './Login.css';
interface LoginErrors {
    fullName?: string;
    email: string;
    password: string;
}

const Login = () => {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'user'
    });

    const [errors, setErrors] = useState<LoginErrors>({
        fullName: '',
        email: '',
        password: ''
    });

    const validateEmail = (email: string) => {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).toLowerCase());
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name as keyof LoginErrors]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        const newErrors: LoginErrors = { fullName: '', email: '', password: '' };
        let isValid = true;

        if (isSignUp && !formData.fullName.trim()) {
            newErrors.fullName = 'Full Name is required';
            isValid = false;
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
            isValid = false;
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
            isValid = false;
        }

        setErrors(newErrors);

        if (isValid) {
            setIsLoading(true);
            try {
                if (isSignUp) {
                    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                    const user = userCredential.user;
                    
                    if (formData.fullName) {
                        try {
                            await updateProfile(user, { displayName: formData.fullName });
                        } catch(e) { console.error("Could not update profile", e); }
                    }
                    
                    const userDoc = {
                        uid: user.uid,
                        email: user.email,
                        name: formData.fullName,
                        role: formData.role
                    };
                    await setDoc(doc(db, 'users', user.uid), userDoc);
                    
                    localStorage.setItem('user', JSON.stringify({
                        id: user.uid,
                        email: user.email,
                        name: formData.fullName,
                        role: formData.role
                    }));
                } else {
                    const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                    const user = userCredential.user;
                    
                    const docSnap = await getDoc(doc(db, 'users', user.uid));
                    let role = 'user';
                    let roomId = '101';
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        role = data.role || 'user';
                        roomId = data.roomId || '101';
                    }
                    
                    localStorage.setItem('user', JSON.stringify({
                        id: user.uid,
                        email: user.email,
                        name: user.displayName || user.email?.split('@')[0],
                        role: role,
                        ...(role === 'user' ? { roomId } : {})
                    }));
                }
                
                if (isSignUp) {
                    navigate('/profile-setup');
                } else {
                    navigate('/dashboard');
                }
            } catch (error: any) {
                console.error("Authentication error:", error);
                setAuthError(error.message || 'Failed to authenticate');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setAuthError('');
        setErrors({ fullName: '', email: '', password: '' });
        setFormData({ fullName: '', email: '', password: '', role: 'user' });
    };

    return (
        <div className="login-container">
            <h1 className="login-main-title">Building Management System</h1>
            <div className="login-card">
                <h2 className="login-title">{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
                
                <div className="role-toggle-container">
                    <button
                        type="button"
                        className={`role-toggle-btn ${formData.role === 'user' ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                    >
                        <UserCircle size={18} className="role-icon" />
                        User
                    </button>
                    <button
                        type="button"
                        className={`role-toggle-btn ${formData.role === 'admin' ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                    >
                        <ShieldCheck size={18} className="role-icon" />
                        Admin
                    </button>
                </div>
                {authError && <div className="error-message" style={{ textAlign: 'center', marginBottom: '15px', color: 'red' }}>{authError}</div>}

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    {isSignUp && (
                        <div className="input-group">
                            <label htmlFor="fullName" className="input-label">Full Name</label>
                            <div className="input-icon-wrapper">
                                <User className="input-icon" size={20} />
                                <input
                                    type="text"
                                    id="fullName"
                                    name="fullName"
                                    className="login-input with-icon"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                            </div>
                            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="email" className="input-label">Email Address</label>
                        <div className="input-icon-wrapper">
                            <Mail className="input-icon" size={20} />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="login-input with-icon"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    <div className="input-group">
                        <label htmlFor="password" className="input-label">Password</label>
                        <div className="input-icon-wrapper">
                            <Lock className="input-icon" size={20} />
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className="login-input with-icon"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        {errors.password && <span className="error-message">{errors.password}</span>}
                    </div>

                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="spinner" size={24} />
                        ) : (
                            isSignUp ? 'Sign Up' : 'Sign In'
                        )}
                    </button>

                    <div className="toggle-container">
                        <p className="toggle-text">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button type="button" className="toggle-button" onClick={toggleMode} disabled={isLoading}>
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
