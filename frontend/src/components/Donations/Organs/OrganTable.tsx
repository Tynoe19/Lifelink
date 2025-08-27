import { Edit, Trash2, ExternalLink } from 'lucide-react';
import { Organ as APIOrgan } from '../../../services/api';

interface Organ {
    id: number;
    organ_name: string;
    blood_type: string;
    additional_notes: string;
    is_available: boolean;
    date_created: string;
    status?: string;
    urgency_level?: string;
    hospital_letter?: string;
    donor: {
        id: number;
        city: string;
        country: string;
        first_name: string;
        last_name: string;
    };
}

interface OrganTableProps {
    organs: Organ[];
    onEdit?: (organ: Organ) => void;
    onDelete?: (organ: Organ) => void;
    onView?: (organ: Organ) => void;
    recipientRequestsView?: boolean;
}

const getUrgencyBadge = (urgency?: string) => {
  if (!urgency) return null;
  let color = 'bg-gray-200 text-gray-700';
  if (urgency.toLowerCase() === 'high') color = 'bg-orange-100 text-orange-700';
  if (urgency.toLowerCase() === 'critical') color = 'bg-red-100 text-red-700';
  if (urgency.toLowerCase() === 'medium') color = 'bg-yellow-100 text-yellow-700';
  if (urgency.toLowerCase() === 'low') color = 'bg-green-100 text-green-700';
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>{urgency}</span>;
};

const OrganTable = ({ organs, onEdit, onDelete, onView, recipientRequestsView }: OrganTableProps) => {
  const getStatusColor = (status: string | undefined) => {
    switch ((status || '').toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'matched':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = (organ: Organ) => {
    if (onEdit) {
      onEdit(organ);
    }
  };

  const handleDelete = (organ: Organ) => {
    if (onDelete) {
      onDelete(organ);
    }
  };

  const handleView = (organ: Organ) => {
    if (onView) {
      onView(organ);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg">
      {organs.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-500">No matching organ listings found.</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organ Type</th>
              {recipientRequestsView && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Type</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listed Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {recipientRequestsView && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgency Level</th>}
              {recipientRequestsView && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hospital Letter</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medical Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {organs.map((organ: Organ) => {
              const donorLocation = organ.donor ? `${organ.donor.city}, ${organ.donor.country}` : 'Location not specified';
              return (
                <tr 
                  key={organ.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{organ.organ_name ? organ.organ_name.charAt(0).toUpperCase() + organ.organ_name.slice(1) : '-'}</div>
                    {recipientRequestsView && <div className="text-sm text-gray-500">{organ.blood_type || '-'}</div>}
                  </td>
                  {recipientRequestsView && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{organ.blood_type || '-'}</td>}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {donorLocation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {organ.date_created ? new Date(organ.date_created).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(organ.status || (organ.is_available ? 'Available' : 'Unavailable'))}`}>
                      {organ.status || (organ.is_available ? 'Available' : 'Unavailable')}
                    </span>
                  </td>
                  {recipientRequestsView && <td className="px-6 py-4 whitespace-nowrap">{getUrgencyBadge(organ.urgency_level)}</td>}
                  {recipientRequestsView && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{organ.hospital_letter || '-'}</td>}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {organ.additional_notes || 'No medical notes provided'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {onEdit && (
                        <button
                          onClick={() => handleEdit(organ)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => handleDelete(organ)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {onView && (
                        <button
                          onClick={() => handleView(organ)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrganTable; 