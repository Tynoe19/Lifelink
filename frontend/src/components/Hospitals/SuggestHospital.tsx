import React, { useState } from 'react';
import { Hospital } from '../../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { Phone, Mail, MapPin, Clock, Globe } from 'lucide-react';

// Fix for default marker icon
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface SuggestHospitalProps {
  hospitals?: Hospital[];
  onSelectHospital?: (hospital: Hospital) => void;
}

const SuggestHospital: React.FC<SuggestHospitalProps> = ({ 
  hospitals = [], 
  onSelectHospital = () => {} 
}) => {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [showMap, setShowMap] = useState(false);

  if (!hospitals || hospitals.length === 0) {
    return (
      <div className="suggested-hospitals">
        <h2 className="text-xl font-semibold mb-4">Suggested Hospitals</h2>
        <p className="text-gray-600">No hospitals available at the moment.</p>
      </div>
    );
  }

  // Calculate center point for the map
  const center = selectedHospital 
    ? [selectedHospital.latitude, selectedHospital.longitude]
    : [35.1264, 33.4299]; // Default to Cyprus center

  return (
    <div className="suggested-hospitals">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Suggested Hospitals</h2>
        <button
          onClick={() => setShowMap(!showMap)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          {showMap ? 'Show List' : 'Show Map'}
        </button>
      </div>

      {showMap ? (
        <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
          <MapContainer
            center={center as [number, number]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {hospitals.map((hospital) => (
              <Marker
                key={hospital.id}
                position={[hospital.latitude, hospital.longitude]}
                icon={defaultIcon}
                eventHandlers={{
                  click: () => setSelectedHospital(hospital)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">{hospital.name}</h3>
                    <p className="text-sm text-gray-600">{hospital.address}</p>
                    <p className="text-sm text-gray-600">{hospital.city}</p>
                    {hospital.distance && (
                      <p className="text-sm text-blue-600">
                        {hospital.distance.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white"
              onClick={() => {
                setSelectedHospital(hospital);
                onSelectHospital(hospital);
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg text-gray-900">{hospital.name}</h3>
                {hospital.distance && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                    {hospital.distance.toFixed(1)} km
                  </span>
                )}
              </div>

              <div className="space-y-2 text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{hospital.address}, {hospital.city}</span>
                </div>
                
                {hospital.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{hospital.phone}</span>
                  </div>
                )}

                {hospital.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{hospital.email}</span>
                  </div>
                )}

                {hospital.website && (
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 mr-2" />
                    <a 
                      href={hospital.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <span className="text-sm text-gray-500">Specialties:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {hospital.specialties.map((specialty: string) => (
                    <span
                      key={specialty}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${hospital.latitude}&mlon=${hospital.longitude}#map=15/${hospital.latitude}/${hospital.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on Map
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestHospital; 