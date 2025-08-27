// Import the environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface WebSocketMessage {
    type: string;
    content: string;
}

interface ChatMessage {
    type: string;
    message: string;
    sender: {
        id: number;
        fullname: string;
    };
    timestamp: string;
    chatRoomId: string;
    is_read?: boolean;
}

class WebSocketService {
    private socket: WebSocket | null = null;
    private connected: boolean = false;
    private messageHandlers: Map<string, ((data: any) => void)> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectTimeoutId: number | null = null;
    private isConnecting = false;

    // Chat-specific
    private chatSocket: WebSocket | null = null;
    private chatHandlers: Map<string, ((data: any) => void)> = new Map();
    private currentChatRoomId: string | null = null;
    private chatConnected: boolean = false;
    private chatReconnectAttempts = 0;
    private chatReconnectTimeoutId: number | null = null;
    private chatConnectionPromise: Promise<void> | null = null;
    private chatConnectionTimeout: number | null = null;

    // Global Chat WebSocket
    private globalChatSocket: WebSocket | null = null;
    private globalChatHandlers: Map<string, ((data: any) => void)> = new Map();
    private globalChatConnected: boolean = false;

    constructor() {
        this.connected = false;
        this.chatConnected = false;
    }

    // Notification WebSocket
    connect() {
        if (this.socket || this.isConnecting) {
            return;
        }
        this.isConnecting = true;
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            this.isConnecting = false;
            return;
        }

        // Use the API URL from environment variables
        const baseUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${baseUrl}/ws/notifications/?token=${token}`;
        console.log('Connecting to notification WebSocket:', wsUrl);
        
        this.socket = new WebSocket(wsUrl);
        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.connected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
        };
        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const handler = this.messageHandlers.get(message.type);
                if (handler) {
                    handler(message);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.connected = false;
            this.socket = null;
            this.isConnecting = false;
            this.handleReconnect();
        };
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.connected = false;
        };
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectTimeoutId = window.setTimeout(() => {
                this.reconnectAttempts++;
                this.connect();
            }, 1000 * Math.pow(2, this.reconnectAttempts));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
        this.connected = false;
        this.messageHandlers.clear();
    }

    addMessageHandler(type: string, handler: (data: any) => void) {
        this.messageHandlers.set(type, handler);
    }

    removeMessageHandler(type: string) {
        this.messageHandlers.delete(type);
    }

    isConnected(): boolean {
        return this.connected;
    }

    // --- Chat WebSocket ---
    async connectToChat(chatRoomId: string): Promise<void> {
        // If we're already connected to this room, return
        if (this.chatConnected && this.currentChatRoomId === chatRoomId) {
            return;
        }

        // If we're in the process of connecting, wait for it to complete
        if (this.chatConnectionPromise) {
            await this.chatConnectionPromise;
            return;
        }

        // Clean up any existing connection
        this.disconnectChat();

        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('No access token found');
        }

        // Use the API URL from environment variables
        const baseUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${baseUrl}/ws/chat/${chatRoomId}/?token=${token}`;
        console.log('Connecting to chat WebSocket:', wsUrl);
        
        this.chatConnectionPromise = new Promise((resolve, reject) => {
            try {
                this.chatSocket = new WebSocket(wsUrl);
                this.currentChatRoomId = chatRoomId;
                this.chatConnected = false;

                // Set connection timeout
                this.chatConnectionTimeout = window.setTimeout(() => {
                    if (this.chatSocket?.readyState !== WebSocket.OPEN) {
                        this.chatSocket?.close();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);

                this.chatSocket.onopen = () => {
                    if (this.chatConnectionTimeout) {
                        clearTimeout(this.chatConnectionTimeout);
                        this.chatConnectionTimeout = null;
                    }
                    console.log('Chat WebSocket connected');
                    this.chatConnected = true;
                    this.chatReconnectAttempts = 0;
                    resolve();
                };

                this.chatSocket.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data) as ChatMessage;
                        console.log('Received chat message:', message);
                        
                        // Validate message structure
                        if (!message || !message.type || !message.message || !message.sender || !message.timestamp) {
                            console.error('Invalid message structure:', message);
                            return;
                        }

                        const handler = this.chatHandlers.get(message.type);
                        if (handler) {
                            handler(message);
                        }
                    } catch (error) {
                        console.error('Error parsing chat WebSocket message:', error);
                    }
                };

                this.chatSocket.onclose = (event) => {
                    if (this.chatConnectionTimeout) {
                        clearTimeout(this.chatConnectionTimeout);
                        this.chatConnectionTimeout = null;
                    }
                    console.log('Chat WebSocket disconnected:', event.code, event.reason);
                    this.chatSocket = null;
                    this.chatConnected = false;
                    
                    // Only attempt reconnect if it's not a normal closure and we're still in the same room
                    if (event.code !== 1000 && this.currentChatRoomId === chatRoomId) {
                        this.handleChatReconnect(chatRoomId);
                    }
                };

                this.chatSocket.onerror = (error) => {
                    if (this.chatConnectionTimeout) {
                        clearTimeout(this.chatConnectionTimeout);
                        this.chatConnectionTimeout = null;
                    }
                    console.error('Chat WebSocket error:', error);
                    this.chatConnected = false;
                    reject(error);
                };
            } catch (error) {
                if (this.chatConnectionTimeout) {
                    clearTimeout(this.chatConnectionTimeout);
                    this.chatConnectionTimeout = null;
                }
                reject(error);
            }
        });

        try {
            await this.chatConnectionPromise;
        } finally {
            this.chatConnectionPromise = null;
        }
    }

    private handleChatReconnect(chatRoomId: string) {
        if (this.chatReconnectAttempts < this.maxReconnectAttempts) {
            this.chatReconnectTimeoutId = window.setTimeout(() => {
                this.chatReconnectAttempts++;
                this.connectToChat(chatRoomId).catch(error => {
                    console.error('Failed to reconnect chat WebSocket:', error);
                });
            }, 1000 * Math.pow(2, this.chatReconnectAttempts));
        }
    }

    isChatConnected(): boolean {
        return this.chatConnected && this.chatSocket?.readyState === WebSocket.OPEN;
    }

    addChatMessageHandler(type: string, handler: (data: any) => void) {
        this.chatHandlers.set(type, handler);
    }

    removeChatMessageHandler(type: string) {
        this.chatHandlers.delete(type);
    }

    async sendChatMessage(message: string, senderId: number, tempId?: string): Promise<void> {
        if (!this.isChatConnected() || !this.currentChatRoomId) {
            throw new Error('Chat WebSocket is not connected or no chat room selected');
        }

        const chatMessage: any = {
            message: message,
            sender_id: senderId,
            chatRoomId: this.currentChatRoomId
        };
        if (tempId) chatMessage.tempId = tempId;

        console.log('Sending chat message:', chatMessage);

        try {
            if (!this.chatSocket || this.chatSocket.readyState !== WebSocket.OPEN) {
                throw new Error('WebSocket is not connected');
            }
            this.chatSocket.send(JSON.stringify(chatMessage));
        } catch (error) {
            console.error('Error sending chat message:', error);
            this.chatConnected = false;
            throw new Error('Failed to send chat message');
        }
    }

    disconnectChat() {
        if (this.chatSocket) {
            try {
                this.chatSocket.close();
            } catch (error) {
                console.error('Error closing chat WebSocket:', error);
            }
            this.chatSocket = null;
        }
        if (this.chatReconnectTimeoutId) {
            clearTimeout(this.chatReconnectTimeoutId);
            this.chatReconnectTimeoutId = null;
        }
        if (this.chatConnectionTimeout) {
            clearTimeout(this.chatConnectionTimeout);
            this.chatConnectionTimeout = null;
        }
        this.chatConnected = false;
        this.currentChatRoomId = null;
        this.chatHandlers.clear();
        this.chatConnectionPromise = null;
    }

    // Global Chat WebSocket
    connectToGlobalChat() {
        if (this.globalChatSocket || this.isConnecting) {
            return;
        }
        this.isConnecting = true;
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            this.isConnecting = false;
            return;
        }

        const baseUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${baseUrl}/ws/chat/global/?token=${token}`;
        console.log('Connecting to global chat WebSocket:', wsUrl);
        
        this.globalChatSocket = new WebSocket(wsUrl);
        this.globalChatSocket.onopen = () => {
            console.log('Global Chat WebSocket connected');
            this.globalChatConnected = true;
            this.isConnecting = false;
        };
        this.globalChatSocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const handler = this.globalChatHandlers.get(message.type);
                if (handler) {
                    handler(message);
                }
            } catch (error) {
                console.error('Error parsing global chat WebSocket message:', error);
            }
        };
        this.globalChatSocket.onclose = () => {
            console.log('Global Chat WebSocket disconnected');
            this.globalChatConnected = false;
            this.globalChatSocket = null;
            this.isConnecting = false;
        };
        this.globalChatSocket.onerror = (error) => {
            console.error('Global Chat WebSocket error:', error);
            this.globalChatConnected = false;
        };
    }

    disconnectGlobalChat() {
        if (this.globalChatSocket) {
            this.globalChatSocket.close();
            this.globalChatSocket = null;
        }
        this.globalChatConnected = false;
        this.globalChatHandlers.clear();
    }

    addGlobalChatMessageHandler(type: string, handler: (data: any) => void) {
        this.globalChatHandlers.set(type, handler);
    }

    removeGlobalChatMessageHandler(type: string) {
        this.globalChatHandlers.delete(type);
    }
}

export const websocketService = new WebSocketService(); 