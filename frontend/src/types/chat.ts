import { User } from './user';

export interface ChatRoom {
    id: number;
    donor?: User;
    recipient?: User;
    organ?: {
        organ_name: string;
        alias?: string;
    };
    last_activity?: string;
    created_at: string;
}

export interface Message {
    id: number;
    content: string;
    sender: {
        id: number;
        fullname: string;
    };
    timestamp: string;
    pending?: boolean;
    is_read?: boolean;
    organ?: {
        name: string;
        id: number;
    };
}

export interface ChatSidebarProps {
    search: string;
    onSearchChange: (value: string) => void;
    chatRooms: ChatRoom[];
    selectedChatRoom: ChatRoom | null;
    onChatRoomSelect: (room: ChatRoom) => void;
    getUnreadCountForRoom: (roomId: string) => number;
}

export interface ChatAreaProps {
    selectedChatRoom: ChatRoom;
    messages: Message[];
    user: User | null;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

export interface MessageInputProps {
    newMessage: string;
    onMessageChange: (value: string) => void;
    onSendMessage: (e: React.FormEvent) => void;
    isConnected: boolean;
} 