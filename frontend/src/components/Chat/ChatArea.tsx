import React, { useEffect } from 'react';
import { ChatAreaProps, Message } from '../../types/chat';

const ChatArea: React.FC<ChatAreaProps> = ({
    selectedChatRoom,
    messages,
    user,
    messagesEndRef
}) => {
    console.log('ChatArea selectedChatRoom:', selectedChatRoom);
    const getSenderDisplayName = (message: Message) => {
        if (!user || !selectedChatRoom) return 'Unknown';
        if (message.sender.id === user.id) return 'You';
        // If current user is donor, show recipient's real name
        if (selectedChatRoom.donor?.id === user.id) {
            return selectedChatRoom.recipient?.fullname || 'Recipient';
        }
        // If current user is recipient, anonymize donor
        if (selectedChatRoom.recipient?.id === user.id) {
            return 'Anonymous Donor';
        }
        // If neither, show donor's real name (do not anonymize)
        return message.sender.fullname || 'Unknown';
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    };

    // Helper to assign recipient number for the donor
    const getRecipientNumber = () => {
        if (!user || selectedChatRoom.donor?.id !== user.id) return null;
        // You may need to pass chatRooms as a prop for full accuracy, but for now, fallback to 1
        // This will be correct if only one chat is open at a time
        return selectedChatRoom.recipient ? 1 : null;
    };

    const getHeaderDisplayName = () => {
        if (!user || !selectedChatRoom) return 'Unknown';
        if (selectedChatRoom.donor?.id === user.id) {
            // Donor view: show anonymized recipient
            const recipientNumber = getRecipientNumber();
            return recipientNumber ? `Recipient ${recipientNumber}` : 'Recipient';
        }
        if (selectedChatRoom.recipient?.id === user.id) {
            return 'Anonymous Donor';
        }
        return selectedChatRoom.donor?.fullname || selectedChatRoom.recipient?.fullname || 'Unknown';
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, messagesEndRef]);

    return (
        <div className="flex-1 flex flex-col">
            <div className="border-b border-gray-200 p-4">
                <h2 className="text-xl font-semibold">
                    {getHeaderDisplayName()}
                </h2>
                <p className="text-gray-500">
                    {(() => {
                        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
                        return lastMessage && lastMessage.organ?.name
                            ? lastMessage.organ.name
                            : selectedChatRoom.organ?.organ_name || 'Unknown Organ';
                    })()}
                </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message: Message) => (
                    <div
                        key={message.id}
                        className={`flex ${
                            message.sender.id === user?.id
                                ? 'justify-end'
                                : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                                message.sender.id === user?.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100'
                            }`}
                        >
                            <div className="flex items-end space-x-2">
                                <div>
                                    <p className="text-sm font-medium">
                                        {getSenderDisplayName(message)}
                                    </p>
                                    <p className="break-words">
                                        {message.content}
                                    </p>
                                    {message.organ && (
                                        <p className="text-xs mt-1 text-gray-500">
                                            Organ: {message.organ.name}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={`text-xs ${
                                        message.sender.id === user?.id
                                            ? 'text-blue-100'
                                            : 'text-gray-500'
                                    }`}
                                >
                                    {formatTimestamp(message.timestamp)}
                                </span>
                            </div>
                            {message.pending && false && (
                                <div className="text-xs text-gray-400 mt-1">
                                    Sending...
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default ChatArea; 