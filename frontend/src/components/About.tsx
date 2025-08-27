import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './About.css';

const About = () => {
    return (
        <div className="about-page">
            <Container>
                <Row className="justify-content-center">
                    <Col lg={8}>
                        <div className="about-content">
                            <h1 className="text-center mb-4">About OrganDonation</h1>
                            
                            {/* Hero Image */}
                            <div className="hero-image mb-5">
                                <img 
                                    src="https://img.freepik.com/free-vector/organ-donation-concept-illustration_114360-10019.jpg" 
                                    alt="Organ Donation Concept" 
                                    className="img-fluid rounded"
                                />
                            </div>

                            <section className="mb-5">
                                <h2>Our Mission</h2>
                                <p>
                                    OrganDonation is dedicated to creating a transparent and efficient platform 
                                    that connects organ donors with recipients in need. Our mission is to save 
                                    lives by making the organ donation process more accessible and streamlined.
                                </p>
                            </section>

                            <section className="mb-5">
                                <h2>How It Works</h2>
                                <div className="steps">
                                    <div className="step">
                                        <img 
                                            src="https://img.freepik.com/free-vector/online-registration-concept-illustration_114360-7865.jpg" 
                                            alt="Registration" 
                                            className="step-image"
                                        />
                                        <h3>1. Register</h3>
                                        <p>Create an account as a donor or recipient</p>
                                    </div>
                                    <div className="step">
                                        <img 
                                            src="https://img.freepik.com/free-vector/search-concept-illustration_114360-10020.jpg" 
                                            alt="Search" 
                                            className="step-image"
                                        />
                                        <h3>2. List or Search</h3>
                                        <p>Donors can list available organs, recipients can search for matches</p>
                                    </div>
                                    <div className="step">
                                        <img 
                                            src="https://img.freepik.com/free-vector/connection-concept-illustration_114360-10021.jpg" 
                                            alt="Connect" 
                                            className="step-image"
                                        />
                                        <h3>3. Connect</h3>
                                        <p>Our platform facilitates secure communication between parties</p>
                                    </div>
                                    <div className="step">
                                        <img 
                                            src="https://img.freepik.com/free-vector/success-concept-illustration_114360-10022.jpg" 
                                            alt="Success" 
                                            className="step-image"
                                        />
                                        <h3>4. Save Lives</h3>
                                        <p>Together, we make organ donation and transplantation possible</p>
                                    </div>
                                </div>
                            </section>

                            <section className="mb-5">
                                <h2>Why Choose Us</h2>
                                <div className="features-grid">
                                    <div className="feature">
                                        <img 
                                            src="https://img.freepik.com/free-vector/security-concept-illustration_114360-10023.jpg" 
                                            alt="Security" 
                                            className="feature-image"
                                        />
                                        <h4>Secure Platform</h4>
                                        <p>Your data is protected with advanced security measures</p>
                                    </div>
                                    <div className="feature">
                                        <img 
                                            src="https://img.freepik.com/free-vector/communication-concept-illustration_114360-10024.jpg" 
                                            alt="Communication" 
                                            className="feature-image"
                                        />
                                        <h4>Direct Communication</h4>
                                        <p>Connect directly with potential matches</p>
                                    </div>
                                    <div className="feature">
                                        <img 
                                            src="https://img.freepik.com/free-vector/support-concept-illustration_114360-10025.jpg" 
                                            alt="Support" 
                                            className="feature-image"
                                        />
                                        <h4>24/7 Support</h4>
                                        <p>Our team is always here to help you</p>
                                    </div>
                                </div>
                            </section>

                            {/* Call to Action Section */}
                            <section className="cta-section text-center p-4 mb-5">
                                <h2 className="mb-4">Ready to Make a Difference?</h2>
                                <p className="mb-4">
                                    Join our community of donors and recipients working together to save lives.
                                    Register now to start your journey.
                                </p>
                                <div className="cta-buttons">
                                    <Link to="/register">
                                        <Button variant="primary" size="lg" className="me-3">
                                            Register Now
                                        </Button>
                                    </Link>
                                    <Link to="/login">
                                        <Button variant="outline-primary" size="lg">
                                            Login
                                        </Button>
                                    </Link>
                                </div>
                            </section>

                            <section>
                                <h2>Contact Us</h2>
                                <p>
                                    Have questions? Our team is here to help. Reach out to us at 
                                    <a href="mailto:support@organdonation.com"> support@organdonation.com</a>
                                </p>
                            </section>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default About; 