import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ChatRoom from './ChatRoom';
import ChatList from './ChatList';

const ChatContainer = () => {
    const { chatRoomId } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateChatRoom = async (organId) => {
        setLoading(true);
        try {
            const response = await axios.post('/api/chat/rooms/', {
                organ: organId
            });
            navigate(`/chat/${response.data.id}`);
        } catch (err) {
            setError('Failed to create chat room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {chatRoomId ? (
                        <ChatRoom chatRoomId={chatRoomId} />
                    ) : (
                        <ChatList onCreateChatRoom={handleCreateChatRoom} />
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default ChatContainer; 