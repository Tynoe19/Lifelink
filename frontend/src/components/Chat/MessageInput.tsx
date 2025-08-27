import React from 'react';
import { MessageInputProps } from '../../types/chat';

const MessageInput: React.FC<MessageInputProps> = ({
    newMessage,
    onMessageChange,
    onSendMessage,
    isConnected
}) => {
    return (
        <div className="border-t border-gray-200 p-4">
            <form onSubmit={onSendMessage} className="flex space-x-4">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!isConnected}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || !isConnected}
                    className={`px-6 py-2 rounded-lg font-medium ${
                        !newMessage.trim() || !isConnected
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                >
                    Send
                </button>
            </form>
            {!isConnected && (
                <p className="text-red-500 text-sm mt-2">
                    Connection lost. Please refresh the page.
                </p>
            )}
        </div>
    );
};

export default MessageInput; 