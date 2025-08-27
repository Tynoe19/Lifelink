import React, { useState, useEffect, useRef } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './Messages.css';
import { FaSearch } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useUnreadMessages } from '../../context/UnreadMessagesContext';
import api, { User } from '../../services/api';
import { websocketService } from '../../services/websocketService';
import { ChatRoom, Message } from '../../types/chat';
import ChatSidebar from '../Chat/ChatSidebar';
import ChatArea from '../Chat/ChatArea';
import MessageInput from '../Chat/MessageInput';

const Messages: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { 
        getUnreadCountForRoom, 
        markAsRead, 
        setCurrentRoomId,
        isConnected,
        sendMessage,
        messages,
        setMessages,
        processedMessages,
        setUnreadCounts
    } = useUnreadMessages();
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [wsConnected, setWsConnected] = useState(false);
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null!);
    const isConnectingRef = useRef(false);

    // Track if we're currently fetching messages
    const isFetchingRef = useRef(false);
    const lastFetchTimeRef = useRef(0);
    const selectedChatRoomIdRef = useRef<number | null>(null);

    // Add message handler
    websocketService.addChatMessageHandler('chat_message', (data: any) => {
        if (!data || data.type !== 'chat_message') return;
        if (!user || !data.sender || data.sender.id === user.id) return;

        // Only process messages for the currently selected chat room
        if (data.chatRoomId !== selectedChatRoom?.id.toString()) {
            console.log('Message received for different chat room:', {
                receivedRoomId: data.chatRoomId,
                currentRoomId: selectedChatRoom?.id,
                metadata: data.metadata
            });
            return;
        }

        const messageKey = `${data.sender.id}-${data.timestamp}-${data.message}`;
        if (processedMessages.has(messageKey)) {
            console.log('Duplicate message received, skipping:', messageKey);
            return;
        }
        processedMessages.add(messageKey);

        console.log('Processing new message for room:', {
            roomId: data.chatRoomId,
            metadata: data.metadata,
            message: data
        });

        // Update messages list
        setMessages(prevMessages => {
            const filtered = prevMessages.filter(
                msg => !msg.pending || msg.content !== data.message || msg.sender.id !== data.sender.id
            );
            return [
                ...filtered,
                {
                    id: Date.now(),
                    content: data.message,
                    sender: {
                        id: data.sender.id,
                        fullname: data.sender.fullname || 'Unknown User'
                    },
                    timestamp: data.timestamp,
                    is_read: data.is_read,
                    metadata: data.metadata
                }
            ];
        });

        // Mark message as read
        if (data.chatRoomId) {
            markAsRead(data.chatRoomId);
        }
    });

    // Effect to handle WebSocket connection
    useEffect(() => {
        let isMounted = true;
        let connectionTimeout: number | null = null;

        const connectToChat = async () => {
            if (!selectedChatRoom?.id || isConnectingRef.current) return;
            
            isConnectingRef.current = true;
            try {
                // Clear any existing connection first
                websocketService.disconnectChat();
                
                // Wait a short time to ensure cleanup is complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Set connection timeout
                connectionTimeout = window.setTimeout(() => {
                    if (isMounted) {
                        setError('Connection timeout. Please try again.');
                        setWsConnected(false);
                    }
                }, 5000);

                await websocketService.connectToChat(selectedChatRoom.id.toString());
                
                if (isMounted) {
                    setWsConnected(true);
                    setError(null);
                }
            } catch (error) {
                console.error('Failed to connect to chat:', error);
                if (isMounted) {
                    setError('Failed to connect to chat. Please try again.');
                    setWsConnected(false);
                }
            } finally {
                isConnectingRef.current = false;
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                }
            }
        };

        connectToChat();

        return () => {
            isMounted = false;
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
            websocketService.disconnectChat();
            setWsConnected(false);
        };
    }, [selectedChatRoom?.id]);

    // Effect to mark messages as read when selecting a chat room
    useEffect(() => {
        if (selectedChatRoom?.id) {
            const unreadCount = getUnreadCountForRoom(selectedChatRoom.id.toString());
            if (unreadCount > 0) {
                markAsRead(selectedChatRoom.id.toString());
            }
            setCurrentRoomId(selectedChatRoom.id.toString());
        } else {
            setCurrentRoomId(null);
        }
        return () => setCurrentRoomId(null);
    }, [selectedChatRoom?.id, getUnreadCountForRoom, markAsRead, setCurrentRoomId]);

    // Show loading state if auth is still loading
    if (authLoading) {
        return (
            <div className="text-center mt-4">
                <Spinner animation="border" />
                <p>Loading authentication...</p>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        navigate('/login');
        return null;
    }

    // Fetch chat rooms
    useEffect(() => {
        const fetchChatRooms = async () => {
            try {
                const response = await api.get<{ results?: ChatRoom[] }>('/api/chat/rooms/');
                const rooms = Array.isArray(response.data) 
                    ? response.data 
                    : response.data.results || [];

                // Fetch unread counts for each room
                const unreadCounts: { [key: string]: number } = {};
                for (const room of rooms) {
                    try {
                        const messagesResponse = await api.get<{ messages: Message[] }>(`/api/chat/rooms/${room.id}/`);
                        const unreadCount = messagesResponse.data.messages.filter(
                            msg => !msg.is_read && msg.sender.id !== user?.id
                        ).length;
                        unreadCounts[room.id.toString()] = unreadCount;
                    } catch (err) {
                        console.error(`Error fetching messages for room ${room.id}:`, err);
                        unreadCounts[room.id.toString()] = 0;
                    }
                }

                setUnreadCounts(unreadCounts);
                setChatRooms(rooms);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching chat rooms:', err);
                setError('Failed to fetch chat rooms. Please try again later.');
                setLoading(false);
                setChatRooms([]);
            }
        };
        
        if (user) {
            fetchChatRooms();
        }
    }, [user, setUnreadCounts]);

    // Fetch messages for selected chat room
    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedChatRoom?.id) return;
            
            if (isFetchingRef.current || selectedChatRoomIdRef.current === selectedChatRoom.id) {
                return;
            }
            
            if (selectedChatRoomIdRef.current !== selectedChatRoom.id) {
                processedMessages.clear();
                selectedChatRoomIdRef.current = selectedChatRoom.id;
            }

            try {
                isFetchingRef.current = true;
                lastFetchTimeRef.current = Date.now();
                
                const response = await api.get<{ messages: Message[] }>(`/api/chat/rooms/${selectedChatRoom.id}/`);
                const fetchedMessages = response.data.messages || [];
                
                // Sort messages by timestamp in ascending order
                const sortedMessages = [...fetchedMessages].sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                
                sortedMessages.forEach(msg => {
                    const messageKey = `${msg.sender.id}-${msg.timestamp}-${msg.content}`;
                    processedMessages.add(messageKey);
                });
                
                setMessages(sortedMessages);
                markAsRead(selectedChatRoom.id.toString());
            } catch (err) {
                console.error('Error fetching messages:', err);
                setError('Failed to fetch messages');
                setMessages([]);
            } finally {
                isFetchingRef.current = false;
            }
        };

        fetchMessages();
    }, [selectedChatRoom?.id, markAsRead, setMessages, processedMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChatRoom || !wsConnected) return;

        const messageToSend = newMessage.trim();
        setNewMessage('');

        const tempMessage: Message = {
            id: Date.now(),
            content: messageToSend,
            sender: {
                id: user!.id,
                fullname: `${user!.first_name} ${user!.last_name}`
            },
            timestamp: new Date().toISOString(),
            pending: true
        };

        // Add the new message to the end of the messages array
        setMessages(prev => [...prev, tempMessage]);

        try {
            await websocketService.sendChatMessage(messageToSend, user!.id);
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message. Please try again.');
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        }
    };

    // Filter chat rooms by search
    const filteredChatRooms = chatRooms.filter(room => {
        const name = `${room.donor?.first_name || ''} ${room.donor?.last_name || ''} ${room.recipient?.first_name || ''} ${room.recipient?.last_name || ''}`.toLowerCase();
        return name.includes(search.toLowerCase()) || (room.organ?.organ_name && room.organ?.organ_name.toLowerCase().includes(search.toLowerCase()));
    });

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
        <div className="messages-main-layout">
            <ChatSidebar
                search={search}
                onSearchChange={setSearch}
                chatRooms={filteredChatRooms}
                selectedChatRoom={selectedChatRoom}
                onChatRoomSelect={setSelectedChatRoom}
                getUnreadCountForRoom={getUnreadCountForRoom}
            />
            
            {selectedChatRoom ? (
                <div className="chat-area">
                    <ChatArea
                        selectedChatRoom={selectedChatRoom}
                        messages={messages}
                        user={user}
                        messagesEndRef={messagesEndRef}
                    />
                    <MessageInput
                        newMessage={newMessage}
                        onMessageChange={setNewMessage}
                        onSendMessage={handleSendMessage}
                        isConnected={wsConnected}
                    />
                </div>
            ) : (
                <div className="no-chat-selected">
                    <p>Select a conversation to start chatting</p>
                </div>
            )}
        </div>
    );
};

export default Messages; 