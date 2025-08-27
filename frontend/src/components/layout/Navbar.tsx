import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BootstrapNavbar, Nav, Button, Modal, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { organsAPI, Organ } from '../../services/api';

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [availableOrgans, setAvailableOrgans] = useState<Organ[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        console.log('Navbar auth state:', user ? 'Authenticated' : 'Not authenticated');
        if (user) {
            console.log('User type:', user.user_type);
        }
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleFindOrgans = () => {
        if (!user) {
            setShowModal(true);
            fetchAvailableOrgans();
        } else if (user.user_type !== 'recipient') {
            setShowModal(true);
            fetchAvailableOrgans();
        } else {
            navigate('/search-organs');
        }
    };

    const fetchAvailableOrgans = async () => {
        setLoading(true);
        try {
            const response = await organsAPI.search();
            const organs = response.data.slice(0, 3);
            setAvailableOrgans(organs);
        } catch (error) {
            console.error('Error fetching organs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = () => {
        setShowModal(false);
        navigate('/register', { state: { redirectTo: '/search-organs', userType: 'recipient' } });
    };

    const handleLogin = () => {
        setShowModal(false);
        navigate('/login');
    };

    return (
        <>
            <BootstrapNavbar bg="dark" variant="dark" expand="lg" className="px-4">
                <BootstrapNavbar.Brand as={Link} to="/">Organ Donation</BootstrapNavbar.Brand>
                <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
                <BootstrapNavbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        <Nav.Link onClick={handleFindOrgans}>Find Organs</Nav.Link>
                        <Dropdown as={Nav.Item}>
                            <Dropdown.Toggle as={Nav.Link}>Resources</Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item as={Link} to="/about">About Us</Dropdown.Item>
                                <Dropdown.Item as={Link} to="/contact">Contact Us</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Nav>
                    <Nav className="ms-auto">
                        {user ? (
                            <>
                                {user.user_type === 'donor' && (
                                    <Nav.Link as={Link} to="/list-organ" className="me-2">
                                        List Organ
                                    </Nav.Link>
                                )}
                                
                                {user.user_type === 'donor' && (
                                    <Nav.Link as={Link} to="/dashboard" className="me-2">
                                        Dashboard
                                    </Nav.Link>
                                )}
                                
                                {user.user_type === 'recipient' && (
                                    <Nav.Link as={Link} to="/dashboard" className="me-2">
                                        Dashboard
                                    </Nav.Link>
                                )}
                                
                                {user.user_type === 'admin' && (
                                    <Nav.Link as={Link} to="/admin" className="me-2">
                                        Admin Panel
                                    </Nav.Link>
                                )}
                                
                                <Button 
                                    onClick={handleLogout}
                                    variant="outline-light"
                                    className="ms-2"
                                >
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button 
                                    as={Link} 
                                    to="/login"
                                    variant="outline-light"
                                    className="me-2"
                                >
                                    Login
                                </Button>
                                <Button 
                                    as={Link} 
                                    to="/register"
                                    variant="light"
                                >
                                    Register
                                </Button>
                            </>
                        )}
                    </Nav>
                </BootstrapNavbar.Collapse>
            </BootstrapNavbar>

            <Modal 
                show={showModal} 
                onHide={() => setShowModal(false)} 
                centered 
                size="sm"
                className="square-modal"
                style={{ maxWidth: '400px', width: '100%' }}
            >
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="text-center w-100">Access Required</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    <p className="mb-3">To search for available organs, you need to be registered and logged in.</p>
                    
                    {loading ? (
                        <div className="text-center">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : availableOrgans.length > 0 ? (
                        <div className="mb-3">
                            <h6 className="text-primary">Available Organs:</h6>
                            {availableOrgans.map((organ) => (
                                <div key={organ.id} className="mb-2">
                                    <strong>{organ.organ_type}</strong> - {organ.blood_type}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-muted mb-3">
                            <p>No organs currently available.</p>
                        </div>
                    )}

                    <div className="mt-3">
                        <p className="text-muted small">
                            Choose an option to continue:
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 justify-content-center">
                    <Button variant="outline-secondary" onClick={() => setShowModal(false)} className="me-2">
                        Cancel
                    </Button>
                    <Button variant="outline-primary" onClick={handleLogin} className="me-2">
                        Login
                    </Button>
                    <Button variant="primary" onClick={handleRegister}>
                        Register
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default Navbar; 