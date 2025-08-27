import React from 'react';
import { ChatSidebarProps } from '../../types/chat';
import { useAuth } from '../../context/AuthContext';

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    search,
    onSearchChange,
    chatRooms,
    selectedChatRoom,
    onChatRoomSelect,
    getUnreadCountForRoom
}) => {
    const { user } = useAuth();

    const getInitials = (name?: string) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    // Helper to assign recipient numbers for the donor
    const getRecipientNumber = (room: any) => {
        if (!user || room.donor?.id !== user.id) return null;
        // Filter all rooms where the user is the donor, sort by created_at, and find the index
        const donorRooms = chatRooms
            .filter((r) => r.donor?.id === user.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const index = donorRooms.findIndex((r) => r.id === room.id);
        return index >= 0 ? index + 1 : null;
    };

    const getDisplayName = (room: any) => {
        if (!user) return 'Unknown User';
        if (room.donor?.id === user.id) {
            // If the current user is the donor, show the recipient's real name
            return room.recipient?.fullname || 'Recipient';
        }
        if (room.recipient?.id === user.id) {
            // If the current user is the recipient, show 'Anonymous Donor'
            return 'Anonymous Donor';
        }
        // For others, show the real names
        return room.donor?.fullname || room.recipient?.fullname || 'Unknown User';
    };

    const getOrganName = (room: any) => {
        return room.organ?.organ_name || 'Unknown Organ';
    };

    return (
        <div className="w-1/4 border-r border-gray-200 p-4">
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search chats..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div className="space-y-2">
                {chatRooms.map((room) => {
                    console.log('Sidebar room:', room);
                    return (
                        <div
                            key={room.id}
                            onClick={() => onChatRoomSelect(room)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedChatRoom?.id === room.id
                                    ? 'bg-blue-100'
                                    : 'hover:bg-gray-100'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        {room.donor?.avatar ? (
                                            <img
                                                src={room.donor.avatar}
                                                alt={getDisplayName(room)}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-gray-500">
                                                {getInitials(getDisplayName(room))}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-medium">
                                            {getDisplayName(room)}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {getOrganName(room)}
                                        </p>
                                    </div>
                                </div>
                                {getUnreadCountForRoom(room.id.toString()) > 0 && (
                                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                        {getUnreadCountForRoom(room.id.toString())}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ChatSidebar; 