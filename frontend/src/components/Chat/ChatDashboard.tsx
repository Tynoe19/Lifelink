import React, { useState } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';

const ChatDashboard = () => {
    const { chatRoomId } = useParams();
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [error, setError] = useState(null);

    const handleCreateChatRoom = () => {
        setShowNewChatModal(true);
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
    };

    return (
        <Container fluid className="mt-4">
            {error && (
                <Alert 
                    variant="danger" 
                    onClose={() => setError(null)} 
                    dismissible
                    className="mb-4"
                >
                    {error}
                </Alert>
            )}
            <Row>
                <Col md={4} className="mb-4">
                    <ChatList 
                        onCreateChatRoom={handleCreateChatRoom} 
                        onError={handleError}
                    />
                </Col>
                <Col md={8}>
                    {chatRoomId ? (
                        <ChatRoom 
                            chatRoomId={chatRoomId} 
                            onError={handleError}
                        />
                    ) : (
                        <div className="text-center text-muted">
                            <h4>Select a chat or start a new conversation</h4>
                            <p>Choose a chat from the list to view messages</p>
                        </div>
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default ChatDashboard; 