import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { FaTimes, FaCheck, FaCheckCircle, FaMapMarkerAlt, FaTint, FaHeartbeat } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../../services/api';

const MESSAGE_TRUNCATE_LENGTH = 40;

interface Donor {
    fullname: string;
}

interface Organ {
    id: number;
    organ_name: string;
    blood_type: string;
    location: string;
    donor: Donor;
}

interface Request {
    id: number;
    organ: Organ;
    status: 'pending' | 'accepted' | 'rejected';
    message: string;
    created_at: string;
}

interface User {
    user_type: string;
}

const MyRequests: React.FC = () => {
    const { user } = useAuth() as { user: User | null };
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filter, setFilter] = useState<string>('all');
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/donations/donation-requests/');
            setRequests(response.data || []);
        } catch (error) {
            toast.error('Failed to load requests.');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: number) => {
        try {
            setLoading(true);
            await api.post(`/api/donations/donation-requests/${requestId}/accept/`);
            toast.success('Request accepted successfully');
            await fetchRequests();
        } catch {
            toast.error('Failed to accept request.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeclineRequest = async (requestId: number) => {
        try {
            setLoading(true);
            await api.post(`/api/donations/donation-requests/${requestId}/reject/`);
            toast.success('Request declined successfully');
            await fetchRequests();
        } catch {
            toast.error('Failed to decline request.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRequest = async (requestId: number) => {
        try {
            setLoading(true);
            await api.delete(`/api/donations/donation-requests/${requestId}/`);
            toast.success('Request cancelled successfully');
            await fetchRequests();
        } catch {
            toast.error('Failed to cancel request.');
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter(request => {
        const matchesSearch = request.organ.organ_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.organ.donor.fullname.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || request.status === filter;
        return matchesSearch && matchesFilter;
    });

    const getStatusVariant = (status: string): string => {
        switch (status) {
            case 'pending': return 'warning';
            case 'accepted': return 'success';
            case 'rejected': return 'danger';
            default: return 'secondary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'accepted':
                return <FaCheckCircle className="me-1" />;
            case 'rejected':
                return <FaTimes className="me-1" />;
            default:
                return null;
        }
    };

    const renderMessage = (request: Request) => {
        const msg = request.message || '';
        if (msg.length <= MESSAGE_TRUNCATE_LENGTH) return msg;
        if (expandedMessageId === request.id) {
            return <>
                {msg} <Button variant="link" size="sm" className="p-0" onClick={() => setExpandedMessageId(null)}>See less</Button>
            </>;
        }
        return <>
            {msg.slice(0, MESSAGE_TRUNCATE_LENGTH)}... <Button variant="link" size="sm" className="p-0" onClick={() => setExpandedMessageId(request.id)}>See more</Button>
        </>;
    };

    return (
        <div className="py-4">
            <div className="w-100" style={{ maxWidth: '100%' }}>
                <h3 className="mb-4">My Requests</h3>
                <div className="mb-3">
                    <div className="d-flex gap-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search by organ or donor name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ maxWidth: '300px' }}
                        />
                        <select
                            className="form-select"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{ maxWidth: '200px' }}
                        >
                            <option value="all">All Requests</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>
                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" />
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <Alert variant="info" className="text-center">No requests found</Alert>
                ) : (
                    <Row xs={1} md={2} lg={3} className="g-4">
                        {filteredRequests.map((request) => (
                            <Col key={request.id}>
                                <Card className="h-100 shadow-sm">
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h5 className="mb-1">{request.organ.organ_name}</h5>
                                                <p className="text-muted mb-0">Donor: {request.organ.donor.fullname}</p>
                                            </div>
                                            <Badge bg={getStatusVariant(request.status)}>
                                                {getStatusIcon(request.status)}
                                                {request.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className="mb-3">
                                            <p className="mb-2">
                                                <FaTint className="me-2 text-danger" />
                                                Blood Type: {request.organ.blood_type || 'Not specified'}
                                            </p>
                                            <p className="mb-2">
                                                <FaMapMarkerAlt className="me-2 text-primary" />
                                                Location: {request.organ.location || 'Not specified'}
                                            </p>
                                            <p className="mb-2">
                                                <FaHeartbeat className="me-2 text-success" />
                                                Requested: {new Date(request.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="mb-3">
                                            <small className="text-muted">Message:</small>
                                            <p className="mb-0">{renderMessage(request)}</p>
                                        </div>
                                        {request.status === 'pending' && user?.user_type === 'recipient' && (
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleCancelRequest(request.id)}
                                                className="w-100"
                                            >
                                                <FaTimes className="me-1" /> Cancel Request
                                            </Button>
                                        )}
                                        {request.status === 'pending' && user?.user_type === 'donor' && (
                                            <div className="d-flex gap-2">
                                                <Button
                                                    variant="outline-success"
                                                    size="sm"
                                                    onClick={() => handleAcceptRequest(request.id)}
                                                    className="flex-grow-1"
                                                >
                                                    <FaCheck className="me-1" /> Accept
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDeclineRequest(request.id)}
                                                    className="flex-grow-1"
                                                >
                                                    <FaTimes className="me-1" /> Decline
                                                </Button>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </div>
        </div>
    );
};

export default MyRequests; 