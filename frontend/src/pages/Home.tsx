import { Link } from 'react-router-dom';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import './Home.css';
import { FaUsers, FaClock, FaHeart, FaHeadset } from 'react-icons/fa';

const Home = () => {
    const { user } = useAuth();

    return (
        <>
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <Container className="hero-content">
                    <Row>
                        <Col md={8} className="text-white">
                            <h1 className="display-3 fw-bold mb-3">
                                Save Lives Through<br />
                                <span className="text-danger">Organ Donation</span>
                            </h1>
                            <p className="lead mb-4">
                                Join our community of donors and recipients. Your decision to donate could give someone a second chance at life.
                            </p>
                            <Link to="/register">
                                <Button 
                                    variant="danger" 
                                    size="lg"
                                    className="fw-bold px-4 py-2"
                                >
                                    JOIN THE COMMUNITY
                                </Button>
                            </Link>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Features Section */}
            <section className="features-section py-5 bg-white">
                <Container>
                    <h5 className="text-center text-danger mb-2" style={{ letterSpacing: '1px' }}>FEATURES</h5>
                    <h2 className="text-center mb-5 fw-bold">Why Choose LifeLink?</h2>
                    <Row className="g-4 justify-content-center">
                        <Col md={6} lg={3} className="d-flex">
                            <div className="feature-card p-3 w-100 d-flex flex-row align-items-start gap-3">
                                <FaUsers size={32} className="text-danger flex-shrink-0" />
                                <div>
                                    <h5 className="fw-bold mb-1">Trusted Community</h5>
                                    <p className="mb-0 small">Join a verified network of donors and medical professionals dedicated to saving lives.</p>
                                </div>
                            </div>
                        </Col>
                        <Col md={6} lg={3} className="d-flex">
                            <div className="feature-card p-3 w-100 d-flex flex-row align-items-start gap-3">
                                <FaClock size={32} className="text-danger flex-shrink-0" />
                                <div>
                                    <h5 className="fw-bold mb-1">Quick Matching</h5>
                                    <p className="mb-0 small">Our advanced matching system helps connect donors with recipients efficiently.</p>
                                </div>
                            </div>
                        </Col>
                        <Col md={6} lg={3} className="d-flex">
                            <div className="feature-card p-3 w-100 d-flex flex-row align-items-start gap-3">
                                <FaHeart size={32} className="text-danger flex-shrink-0" />
                                <div>
                                    <h5 className="fw-bold mb-1">Save Lives</h5>
                                    <p className="mb-0 small">Make a real difference by giving others a second chance at life.</p>
                                </div>
                            </div>
                        </Col>
                        <Col md={6} lg={3} className="d-flex">
                            <div className="feature-card p-3 w-100 d-flex flex-row align-items-start gap-3">
                                <FaHeadset size={32} className="text-danger flex-shrink-0" />
                                <div>
                                    <h5 className="fw-bold mb-1">Expert Support</h5>
                                    <p className="mb-0 small">Get guidance from medical professionals throughout your donation journey.</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Call to Action Section */}
            <section className="cta-section py-5" style={{ background: '#c82333' }}>
                <Container>
                    <h2 className="text-center text-white fw-bold mb-3" style={{ fontSize: '2.2rem' }}>
                        Ready to make a difference?<br />
                        Start your donation journey today.
                    </h2>
                    <p className="text-center text-white mb-4 lead">
                        Join thousands of donors who have already made the decision to save lives.
                    </p>
                    <div className="d-flex justify-content-center">
                        <Link to="/register">
                            <Button variant="light" size="lg" className="fw-bold px-4 py-2 text-danger">
                                Register Now
                            </Button>
                        </Link>
                    </div>
                </Container>
            </section>

            <section className="get-started-section">
                <Container>
                    <h2 className="text-center mb-4">How to Get Started</h2>
                    <Row className="g-4">
                        <Col md={4}>
                            <Card className="info-card">
                                <Card.Body>
                                    <Card.Title>Register</Card.Title>
                                    <Card.Text>
                                        Create an account as a donor or recipient to start your journey.
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="info-card">
                                <Card.Body>
                                    <Card.Title>List or Search</Card.Title>
                                    <Card.Text>
                                        Donors can list available organs, recipients can search for matches.
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="info-card">
                                <Card.Body>
                                    <Card.Title>Connect</Card.Title>
                                    <Card.Text>
                                        Communicate with potential matches and coordinate the donation process.
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </section>
        </>
    );
};

export default Home;
