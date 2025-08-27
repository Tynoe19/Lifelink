import { useState, useEffect } from 'react';
import { Form, Button, Container, Card, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { countries } from 'countries-list';
import { FaArrowLeft } from 'react-icons/fa';
import LocationPicker from '../Dashboard/LocationPicker';

interface RegisterFormData {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    date_of_birth: Date | null;
    gender: string;
    user_type: string;
    city: string;
    country: string;
    phone_number: string;
    blood_type: string;
    address: string;
    postal_code: string;
    latitude: string;
    longitude: string;
    // Recipient specific fields
    urgency_level: string;
    organ_type: string;
    hospital_letter: File | null;
}

const Register: React.FC = () => {
    // Northern Cyprus cities
    const northernCyprusCities = [
        'Nicosia (Lefkoşa)',
        'Kyrenia (Girne)',
        'Famagusta (Gazimağusa)',
        'Morphou (Güzelyurt)',
        'Iskele (Trikomo)',
        'Lefke',
        'Lapithos (Lapta)',
        'Karavas (Alsancak)',
        'Kythrea (Değirmenlik)',
        'Larnaca (Larnaka)',
        'Paphos (Baf)',
        'Limassol (Limasol)'
    ];

    const [formData, setFormData] = useState<RegisterFormData>({
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        date_of_birth: null,
        gender: '',
        user_type: '',
        city: '',
        country: 'CY', // Pre-set to Cyprus
        phone_number: '',
        blood_type: '',
        address: '',
        postal_code: '',
        latitude: '',
        longitude: '',
        // Recipient specific fields
        urgency_level: '',
        organ_type: '',
        hospital_letter: null
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [emailError, setEmailError] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');

    // Check for redirect state
    useEffect(() => {
        if (location.state?.userType) {
            setFormData(prev => ({
                ...prev,
                user_type: location.state.userType
            }));
        }
    }, [location.state]);

    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    const validateForm = (): boolean => {
        const {  email, password, password_confirm, first_name, last_name, date_of_birth, gender, user_type, city, country, phone_number, blood_type, urgency_level, organ_type } = formData;

        let valid = true;
        setEmailError('');
        setPasswordError('');

        if (!email.includes('@') || !email.includes('.')) {
            setEmailError('Please enter a valid email address');
            valid = false;
        }

        if (!/^[A-Za-z\s]+$/.test(first_name)) {
            setError('First name should only contain letters');
            valid = false;
        }

        if (!/^[A-Za-z\s]+$/.test(last_name)) {
            setError('Last name should only contain letters');
            valid = false;
        }

        if (password !== password_confirm) {
            setPasswordError('Passwords do not match');
            valid = false;
        }

        if (!email || !password || !password_confirm || !first_name || !last_name || !date_of_birth || !gender || !user_type || !city || !country || !phone_number || !blood_type) {
            setError('All fields are required');
            valid = false;
        }

        if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters long');
            valid = false;
        }

        return valid;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDateChange = (date: Date | null): void => {
        setFormData(prev => ({
            ...prev,
            date_of_birth: date
        }));
    };

    const handleLocationSelect = (location: {
        address: string;
        city: string;
        country: string;
        latitude: number;
        longitude: number;
        postal_code: string;
    }): void => {
        setFormData(prev => ({
            ...prev,
            address: location.address,
            city: location.city,
            country: location.country,
            postal_code: location.postal_code,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString()
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            console.log('Submitting registration data:', formData);
            const response = await authAPI.register({
                ...formData,
                user_type: formData.user_type as 'donor' | 'recipient',
                date_of_birth: formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : '',
                is_verified: false,
                recipient_profile: formData.user_type === 'recipient' ? {
                    hospital_letter: formData.hospital_letter
                } : undefined
            });
            
            console.log('Registration response:', response);
            
            if (response.status === 201) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log('Attempting auto-login...');
                await login(formData.email, formData.password);
                console.log('Auto-login successful, navigating to dashboard');
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            console.error('Full error response:', err.response?.data);
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (err.response?.data?.email) {
                if (Array.isArray(err.response.data.email) && err.response.data.email[0].toLowerCase().includes('already')) {
                    setError('An account with this email already exists. Please use a different email or sign in.');
                } else {
                    setError(err.response.data.email[0]);
                }
            } else if (err.message) {
                setError(err.message);
            } else {
                setError('An error occurred during registration. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center auth-bg">
            <div className="auth-form-container register">
                <div className="w-100 mb-3">
                    <Link to="/" className="text-decoration-none text-primary d-flex align-items-center gap-2">
                        <FaArrowLeft />
                        <span>Back to Home</span>
                    </Link>
                </div>
                <Card className="auth-card">
                    <Card.Body>
                        <h2 className="text-center mb-2">Create Account</h2>
                        <p className="text-center text-muted small mb-4">Join our community today</p>
                        
                        {error && <Alert variant="danger">{error}</Alert>}
                        
                        <Form onSubmit={handleSubmit}>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Control
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        required
                                        placeholder="First Name"
                                        className="auth-input"
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Control
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Last Name"
                                        className="auth-input"
                                    />
                                </Col>
                                <Col xs={12}>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="Email"
                                        className="auth-input"
                                    />
                                    {emailError && <div style={{ color: 'red', fontSize: '0.9em' }}>{emailError}</div>}
                                </Col>
                                <Col xs={12}>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="Password"
                                        className="auth-input"
                                    />
                                </Col>
                                <Col xs={12}>
                                    <Form.Control
                                        type="password"
                                        name="password_confirm"
                                        value={formData.password_confirm}
                                        onChange={handleChange}
                                        required
                                        placeholder="Confirm Password"
                                        className="auth-input"
                                    />
                                    {passwordError && <div style={{ color: 'red', fontSize: '0.9em' }}>{passwordError}</div>}
                                </Col>
                                <Col xs={12}>
                                    <Form.Select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        required
                                        className="auth-input"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </Form.Select>
                                </Col>
                                <Col xs={12}>
                                    <Form.Select
                                        name="blood_type"
                                        value={formData.blood_type}
                                        onChange={handleChange}
                                        required
                                        className="auth-input"
                                    >
                                        <option value="">Blood Type</option>
                                        {bloodTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col xs={12}>
                                    <DatePicker
                                        selected={formData.date_of_birth && formData.date_of_birth instanceof Date && !isNaN(formData.date_of_birth.getTime()) ? formData.date_of_birth : null}
                                        onChange={handleDateChange}
                                        dateFormat="yyyy-MM-dd"
                                        placeholderText="Date of Birth (YYYY-MM-DD)"
                                        className="form-control auth-input"
                                        maxDate={new Date()}
                                        showYearDropdown
                                        scrollableYearDropdown
                                        yearDropdownItemNumber={100}
                                        required
                                        name="date_of_birth"
                                    />
                                </Col>
                                <Col xs={12}>
                                    <Form.Select
                                        name="user_type"
                                        value={formData.user_type}
                                        onChange={handleChange}
                                        required
                                        className="auth-input"
                                    >
                                        <option value="">I want to be a</option>
                                        <option value="donor">Donor</option>
                                        <option value="recipient">Recipient</option>
                                    </Form.Select>
                                </Col>
                                <Col xs={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Country</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value="Northern Cyprus"
                                            disabled
                                            className="auth-input"
                                        />
                                        <Form.Text className="text-muted">
                                            This platform is currently available for Northern Cyprus residents only
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col xs={12} className="mb-3">
                                    <LocationPicker
                                        onLocationSelect={handleLocationSelect}
                                        initialLocation={formData.address ? {
                                            address: formData.address,
                                            city: formData.city,
                                            country: formData.country,
                                            latitude: parseFloat(formData.latitude),
                                            longitude: parseFloat(formData.longitude),
                                            postal_code: formData.postal_code
                                        } : undefined}
                                    />
                                </Col>
                                <Col xs={12}>
                                    <Form.Control
                                        type="tel"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        required
                                        placeholder="Phone Number (e.g., +263771234567)"
                                        className="auth-input"
                                        pattern="^\+[1-9]\d{1,14}$"
                                        title="Please enter a valid international phone number starting with + and country code (e.g., +263771234567)"
                                    />
                                    <small className="text-muted">Format: +[Country Code][Number] (e.g., +263771234567)</small>
                                </Col>
                            </Row>

                            <Button 
                                variant="primary" 
                                type="submit" 
                                className="w-100 mt-4"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Creating Account...
                                    </>
                                ) : 'Create Account'}
                            </Button>
                            <div className="text-center mt-3">
                                <p className="text-muted mb-0 small">
                                    Already have an account? <Link to="/login">Sign In</Link>
                                </p>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default Register;
