import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';

const NotFound = () => {
    return (
        <Container className="py-5">
            <Row className="justify-content-center text-center">
                <Col md={6}>
                    <FaExclamationTriangle className="text-warning mb-4" style={{ fontSize: '4rem' }} />
                    <h1 className="mb-4">404 - Page Not Found</h1>
                    <p className="lead mb-4">
                        Sorry, the page you are looking for does not exist or has been moved.
                    </p>
                    <Link to="/">
                        <Button variant="primary" size="lg">
                            Return to Home
                        </Button>
                    </Link>
                </Col>
            </Row>
        </Container>
    );
};

export default NotFound; 