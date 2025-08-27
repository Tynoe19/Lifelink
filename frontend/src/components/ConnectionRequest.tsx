import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { websocketService } from '../services/websocketService';
import donationsAPI from '../services/donationsAPI';
import { toast } from 'react-toastify';
import { OrganRequest } from '../services/api';
import SuggestedHospitals from './Hospitals/SuggestedHospitals';

interface ConnectionRequest {
    id: number;
    recipient_name: string;
    message: string;
    status: 'pending' | 'accepted' | 'rejected';
    chat_room_id?: string;
}

const ConnectionRequest = () => {
    const { organId } = useParams();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);

    useEffect(() => {
        // Connect to WebSocket
        const token = localStorage.getItem('access_token');
        if (token) {
            websocketService.connect();
        }

        // Set up WebSocket callbacks
        websocketService.addMessageHandler('connection_request', handleNewConnectionRequest);
        websocketService.addMessageHandler('request_accepted', handleRequestAccepted);
        websocketService.addMessageHandler('request_rejected', handleRequestRejected);

        // Load existing connection requests
        loadConnectionRequests();

        return () => {
            websocketService.disconnect();
        };
    }, [organId]);

    const loadConnectionRequests = async () => {
        try {
            const response = await donationsAPI.getMyRequests();
            const formattedRequests: ConnectionRequest[] = response.data.map((req: OrganRequest) => ({
                id: req.id,
                recipient_name: `${req.recipient.first_name} ${req.recipient.last_name}`,
                message: req.message || '',
                status: req.status as 'pending' | 'accepted' | 'rejected',
                chat_room_id: req.organ_details?.id?.toString()
            }));
            setConnectionRequests(formattedRequests);
        } catch (error) {
            toast.error('Failed to load connection requests');
        }
    };

    const handleNewConnectionRequest = (request: ConnectionRequest) => {
        setConnectionRequests(prev => [...prev, request]);
    };

    const handleRequestAccepted = (request: ConnectionRequest) => {
        setConnectionRequests(prev => 
            prev.map(req => 
                req.id === request.id ? { ...req, status: 'accepted' } : req
            )
        );
        setSelectedConnectionId(request.id);
        
        // If the response includes a chat room ID, navigate to the chat room
        if (request.chat_room_id) {
            // You can either navigate to the chat room or show a button to open it
            toast.success('Connection request accepted. You can now chat with the recipient.');
        } else {
            toast.success('Connection request accepted');
        }
    };

    const handleRequestRejected = (request: ConnectionRequest) => {
        setConnectionRequests(prev => 
            prev.map(req => 
                req.id === request.id ? { ...req, status: 'rejected' } : req
            )
        );
        toast.info('Connection request rejected');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            toast.error('Please enter a message');
            return;
        }

        setIsLoading(true);
        try {
            if (organId) {
                await donationsAPI.requestOrgan(parseInt(organId), message);
                toast.success('Connection request sent');
                setMessage('');
            }
        } catch (error) {
            toast.error('Failed to send connection request');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Connection Requests</h2>
            
            {/* Connection Request Form */}
            <form onSubmit={handleSubmit} className="mb-6">
                <div className="mb-4">
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Message
                    </label>
                    <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        rows={4}
                        placeholder="Enter your message..."
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isLoading ? 'Sending...' : 'Send Connection Request'}
                </button>
            </form>

            {/* Connection Requests List */}
            <div className="space-y-4">
                {connectionRequests.map(request => (
                    <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium">{request.recipient_name}</p>
                                <p className="text-gray-600">{request.message}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-sm ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                                {request.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Suggested Hospitals Section */}
            {selectedConnectionId && (
                <div className="mt-8">
                    <SuggestedHospitals connectionId={selectedConnectionId} />
                </div>
            )}
        </div>
    );
};

export default ConnectionRequest; 