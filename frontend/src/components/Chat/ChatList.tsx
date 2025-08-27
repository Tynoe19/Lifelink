import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Button, Spinner, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const ChatList = ({ onCreateChatRoom }) => {
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchChatRooms();
        const interval = setInterval(fetchChatRooms, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchChatRooms = async () => {
        try {
            const response = await axios.get('/api/chat/rooms/');
            setChatRooms(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch chat rooms');
            setLoading(false);
        }
    };

    const handleChatRoomClick = (chatRoomId) => {
        navigate(`/chat/${chatRoomId}`);
    };

    if (loading) {
        return (
            <div className="text-center mt-4">
                <Spinner animation="border" />
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Your Chats</h5>
                <Button variant="primary" onClick={onCreateChatRoom}>
                    New Chat
                </Button>
            </Card.Header>
            <Card.Body>
                {chatRooms.length === 0 ? (
                    <div className="text-center text-muted">
                        No chat rooms available. Start a new chat to connect with donors.
                    </div>
                ) : (
                    <ListGroup variant="flush">
                        {chatRooms.map((chatRoom) => (
                            <ListGroup.Item
                                key={chatRoom.id}
                                action
                                onClick={() => handleChatRoomClick(chatRoom.id)}
                                className="d-flex justify-content-between align-items-center"
                            >
                                <div>
                                    <h6 className="mb-1">{chatRoom.donor?.fullname || 'Unknown Donor'}</h6>
                                    <small className="text-muted">
                                        {chatRoom.organ?.organ_name || 'Unknown Organ'} | 
                                        Blood Type: {chatRoom.organ?.blood_type || 'Unknown'}
                                    </small>
                                </div>
                                <div className="text-end">
                                    <small className="text-muted d-block">
                                        {formatDistanceToNow(
                                            new Date(chatRoom.last_message?.timestamp || chatRoom.created_at), 
                                            { addSuffix: true }
                                        )}
                                    </small>
                                    {chatRoom.unread_count > 0 && (
                                        <Badge bg="primary" pill>
                                            {chatRoom.unread_count}
                                        </Badge>
                                    )}
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </Card.Body>
        </Card>
    );
};

export default ChatList; 