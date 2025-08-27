import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { websocketService } from '../services/websocketService';
import { Message } from '../types/chat';

interface UnreadMessagesContextType {
    unreadCounts: { [key: string]: number };
    totalUnreadCount: number;
    markAsRead: (chatRoomId: string) => void;
    getUnreadCountForRoom: (chatRoomId: string) => number;
    setCurrentRoomId: (roomId: string | null) => void;
    isConnected: boolean;
    sendMessage: (message: string) => void;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    processedMessages: Set<string>;
    setUnreadCounts: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

export const UnreadMessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const isConnectingRef = useRef(false);
    const processedMessagesRef = useRef(new Set<string>());
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

    const markAsRead = useCallback(async (chatRoomId: string) => {
        if (!user) return;
        try {
            console.log('Marking messages as read for room:', chatRoomId);
            const response = await fetch(`${API_URL}/api/chat/rooms/${chatRoomId}/mark_read/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`Failed to mark messages as read: ${response.statusText}`);
            }
            
            // Update local state
            setUnreadCounts(prev => ({ ...prev, [chatRoomId]: 0 }));
            
            // Update messages to mark them as read
            setMessages(prev => prev.map(msg => ({
                ...msg,
                is_read: true
            })));
            
            console.log('Successfully marked messages as read for room:', chatRoomId);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }, [user, API_URL, setMessages]);

    const getUnreadCountForRoom = useCallback((chatRoomId: string) => {
        return unreadCounts[chatRoomId] || 0;
    }, [unreadCounts]);

    const sendMessage = useCallback((message: string) => {
        if (!user || !currentRoomId || !isConnected) return;
        websocketService.sendChatMessage(message, user.id);
    }, [user, currentRoomId, isConnected]);

    // Handle WebSocket connection for the current room
    useEffect(() => {
        if (!user || !currentRoomId) {
            setIsConnected(false);
            return;
        }

        const connectToChat = async () => {
            if (isConnectingRef.current) return;
            isConnectingRef.current = true;

            try {
                // Remove any existing message handler before connecting
                websocketService.removeChatMessageHandler('chat_message');
                
                // Disconnect any existing connection
                websocketService.disconnectChat();

                // Connect to the new room
                await websocketService.connectToChat(currentRoomId.toString());
                setIsConnected(true);

                // Add message handler
                websocketService.addChatMessageHandler('chat_message', (data: any) => {
                    if (!data || data.type !== 'chat_message') return;
                    if (!data.sender || data.sender.id === user.id) return;

                    const messageKey = `${data.sender.id}-${data.timestamp}-${data.message}`;
                    if (processedMessagesRef.current.has(messageKey)) {
                        console.log('Duplicate message received, skipping:', messageKey);
                        return;
                    }
                    processedMessagesRef.current.add(messageKey);

                    console.log('Processing new message:', data);

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
                                    fullname: data.sender.fullname
                                },
                                timestamp: data.timestamp,
                                is_read: data.is_read
                            }
                        ];
                    });

                    // Update unread count if message is not from current user and not in current room
                    if (data.sender.id !== user.id && data.chatRoomId !== currentRoomId) {
                        setUnreadCounts(prev => ({
                            ...prev,
                            [data.chatRoomId]: (prev[data.chatRoomId] || 0) + 1
                        }));
                    }
                });
            } catch (error) {
                console.error('Error connecting to chat:', error);
                setIsConnected(false);
            } finally {
                isConnectingRef.current = false;
            }
        };

        connectToChat();

        return () => {
            websocketService.removeChatMessageHandler('chat_message');
            websocketService.disconnectChat();
            setIsConnected(false);
            processedMessagesRef.current.clear();
        };
    }, [user, currentRoomId]);

    return (
        <UnreadMessagesContext.Provider value={{
            unreadCounts,
            totalUnreadCount,
            markAsRead,
            getUnreadCountForRoom,
            setCurrentRoomId,
            isConnected,
            sendMessage,
            messages,
            setMessages,
            processedMessages: processedMessagesRef.current,
            setUnreadCounts
        }}>
            {children}
        </UnreadMessagesContext.Provider>
    );
};

export const useUnreadMessages = () => {
    const context = useContext(UnreadMessagesContext);
    if (context === undefined) {
        throw new Error('useUnreadMessages must be used within an UnreadMessagesProvider');
    }
    return context;
}; 