import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { FaArrowLeft } from 'react-icons/fa';

interface LoginFormData {
    email: string;
    password: string;
}

const Login = () => {
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: ''
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated, authError } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Submitting login form with:', { email: formData.email });
            await login(formData.email, formData.password);
            // Navigation will be handled by the useEffect hook
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (err.response?.data?.non_field_errors) {
                setError(err.response.data.non_field_errors[0]);
            } else if (err.message) {
                setError(err.message);
            } else {
                setError('An error occurred during login. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center auth-bg">
            <div className="auth-form-container">
                <div className="w-100 mb-3">
                    <Link to="/" className="text-decoration-none text-primary d-flex align-items-center gap-2">
                        <FaArrowLeft />
                        <span>Back to Home</span>
                    </Link>
                </div>
                <div className="card auth-card">
                    <div className="card-body">
                        <h2 className="text-center mb-2">Welcome Back</h2>
                        <p className="text-center text-muted small mb-4">Please enter your login details</p>
                        {(error || authError) && <Alert variant="danger">{error || authError}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Email address</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                />
                                <div className="text-end mt-1">
                                    <Link to="/reset-password" className="text-decoration-none small">
                                        Forgot password?
                                    </Link>
                                </div>
                            </Form.Group>

                            <Button 
                                variant="primary" 
                                type="submit" 
                                className="w-100" 
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </Form>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default Login;
