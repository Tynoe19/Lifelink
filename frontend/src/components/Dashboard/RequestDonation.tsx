import { useState, useEffect } from 'react';
import { Modal, Button, Card, Row, Col, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface DonorInfo {
    age: number;
    gender: string;
    blood_type: string;
    city: string;
    last_updated: string;
    medical_history?: string;
}

interface ChatRoom {
    id: number;
    // Add other chat room properties as needed
}

interface Donation {
    id: number;
    organ_name: string;
    blood_type: string;
    city: string;
    is_available: boolean;
    created_at: string;
}

interface RequestDonationProps {
    donation: Donation;
    show: boolean;
    onHide: () => void;
}

const RequestDonation: React.FC<RequestDonationProps> = ({ donation, show, onHide }) => {
    const [donorInfo, setDonorInfo] = useState<DonorInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (show && donation) {
            fetchDonorInfo();
        }
    }, [show, donation]);

    const fetchDonorInfo = async (): Promise<void> => {
        try {
            const response = await axios.get<DonorInfo>(`/api/donations/${donation.id}/donor-info/`);
            setDonorInfo(response.data);
        } catch (err) {
            setError('Failed to fetch donor information');
        }
    };

    const handleRequest = async (): Promise<void> => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // First, request the organ
            const requestResponse = await axios.post<{ chat_room?: ChatRoom }>(`/api/donations/${donation.id}/request/`);
            
            if (requestResponse.data.chat_room) {
                setChatRoom(requestResponse.data.chat_room);
                setSuccess('Request sent successfully! You can now message the donor.');
            } else {
                setSuccess('Request sent successfully! The donor will review your request.');
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || 'Failed to send request');
            } else {
                setError('Failed to send request');
            }
        } finally {
            setLoading(false);
        }
    };

    const startChat = (): void => {
        if (chatRoom) {
            navigate(`/chat/${chatRoom.id}`);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Request Organ Donation</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Card className="mb-3">
                    <Card.Body>
                        <h5>Organ Details</h5>
                        <Row>
                            <Col md={6}>
                                <p><strong>Organ:</strong> {donation.organ_name}</p>
                                <p><strong>Blood Type:</strong> {donation.blood_type}</p>
                                <p><strong>Location:</strong> {donation.city}</p>
                            </Col>
                            <Col md={6}>
                                <p><strong>Availability:</strong> 
                                    <Badge bg={donation.is_available ? "success" : "danger"}>
                                        {donation.is_available ? "Available" : "Not Available"}
                                    </Badge>
                                </p>
                                <p><strong>Posted:</strong> {new Date(donation.created_at).toLocaleDateString()}</p>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {donorInfo && (
                    <Card className="mb-3">
                        <Card.Body>
                            <h5>Donor Information</h5>
                            <Row>
                                <Col md={6}>
                                    <p><strong>Age:</strong> {donorInfo.age}</p>
                                    <p><strong>Gender:</strong> {donorInfo.gender}</p>
                                    <p><strong>Blood Type:</strong> {donorInfo.blood_type}</p>
                                </Col>
                                <Col md={6}>
                                    <p><strong>Location:</strong> {donorInfo.city}</p>
                                    <p><strong>Last Updated:</strong> {new Date(donorInfo.last_updated).toLocaleDateString()}</p>
                                </Col>
                            </Row>
                            <div className="mt-3">
                                <h6>Medical History</h6>
                                <p className="text-muted">
                                    {donorInfo.medical_history || 'No specific medical history provided'}
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                )}

                {!chatRoom && (
                    <Alert variant="info">
                        <p>By requesting this organ, you agree to:</p>
                        <ul>
                            <li>Maintain confidentiality of donor information</li>
                            <li>Use the messaging system for communication</li>
                            <li>Follow medical protocols and guidelines</li>
                            <li>Coordinate with healthcare professionals</li>
                        </ul>
                    </Alert>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                {!chatRoom ? (
                    <Button 
                        variant="primary" 
                        onClick={handleRequest}
                        disabled={loading || !donation.is_available}
                    >
                        {loading ? 'Sending Request...' : 'Request Organ'}
                    </Button>
                ) : (
                    <Button 
                        variant="success" 
                        onClick={startChat}
                    >
                        Start Chat with Donor
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default RequestDonation; 