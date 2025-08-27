import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { format } from 'date-fns';
import { websocketService } from '../../services/websocketService';
import { useAuth } from '../../context/AuthContext';

interface Message {
    id?: number;
    content: string;
    sender: { id: number; fullname: string };
    timestamp: string;
    pending?: boolean;
    tempId?: string;
}

interface ChatRoomData {
    id: number;
    organ: {
        organ_name: string;
        blood_type: string;
    };
    donor: {
        fullname: string;
    };
}

interface ChatRoomProps {
    chatRoomId: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ chatRoomId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chatRoom, setChatRoom] = useState<ChatRoomData | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    useEffect(() => {
        fetchChatRoom();
        fetchMessages();
        setupWebSocket();
        
        return () => {
            websocketService.disconnectChat();
        };
    }, [chatRoomId]);

    const setupWebSocket = async () => {
        try {
            await websocketService.connectToChat(chatRoomId);
            websocketService.addChatMessageHandler('chat_message', (data: Message) => {
                setMessages(prev => {
                    // If tempId is present, match and replace by tempId
                    if (data.tempId) {
                        const filtered = prev.filter(m => m.tempId !== data.tempId);
                        return [...filtered, { ...data, pending: false }];
                    }
                    // Fallback: Remove any pending message with the same content and sender
                    const filtered = prev.filter(
                        m => !(m.pending && m.content === data.content && m.sender.id === data.sender.id)
                    );
                    return [...filtered, { ...data, pending: false }];
                });
            });
        } catch (err) {
            setError('Failed to connect to chat');
        }
    };

    const fetchChatRoom = async () => {
        try {
            const response = await axios.get<ChatRoomData>(`/api/chat/rooms/${chatRoomId}/`);
            setChatRoom(response.data);
        } catch (err) {
            setError('Failed to load chat room details');
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await axios.get<Message[]>(`/api/chat/rooms/${chatRoomId}/messages/`);
            setMessages(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to load messages');
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        const tempId = Date.now().toString() + Math.random().toString();
        const pendingMessage: Message = {
            tempId,
            content: newMessage,
            sender: { id: user.id, fullname: user.fullname },
            timestamp: new Date().toISOString(),
            pending: true,
        };
        setMessages(prev => [...prev, pendingMessage]);
        try {
            if (websocketService.isChatConnected()) {
                websocketService.sendChatMessage(newMessage, user.id, tempId);
            } else {
                const response = await axios.post<Message>(`/api/chat/rooms/${chatRoomId}/messages/`, {
                    content: newMessage
                });
                setMessages(prev => [...prev, response.data]);
            }
            setNewMessage('');
        } catch (err) {
            setError('Failed to send message');
        }
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
                <div>
                    <h5 className="mb-0">
                        {chatRoom?.organ?.organ_name} - {chatRoom?.donor?.fullname}
                    </h5>
                    <small className="text-muted">
                        Blood Type: {chatRoom?.organ?.blood_type}
                    </small>
                </div>
                <div>
                    <Badge bg={websocketService.isChatConnected() ? "success" : "danger"}>
                        {websocketService.isChatConnected() ? "Connected" : "Disconnected"}
                    </Badge>
                </div>
            </Card.Header>
            <Card.Body className="chat-messages" style={{ height: '60vh', overflowY: 'auto' }}>
                {messages.map((message) => (
                    <div
                        key={message.id || message.timestamp}
                        className={`message ${message.sender.id === user?.id ? 'recipient' : 'donor'}`}
                    >
                        <div className="message-content">
                            <p>{message.content}</p>
                            <small className="text-muted">
                                {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                            </small>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </Card.Body>
            <Card.Footer>
                <Form onSubmit={handleSendMessage}>
                    <div className="d-flex">
                        <Form.Control
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="me-2"
                            disabled={!websocketService.isChatConnected()}
                        />
                        <Button 
                            type="submit" 
                            variant="primary"
                            disabled={!websocketService.isChatConnected()}
                        >
                            Send
                        </Button>
                    </div>
                </Form>
            </Card.Footer>
        </Card>
    );
};

export default ChatRoom; 