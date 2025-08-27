import React, { useState, useEffect } from 'react';
import { Building, Star } from 'lucide-react';
import { useSuggestedHospitals } from '../../context/SuggestedHospitalsContext';
import { Hospital } from '../../types';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';

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


const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = { lat: 35.1264, lng: 33.4299 }; // Cyprus center

const SuggestedHospitalsPage: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>();
  const {
    suggestedHospitals,
    allHospitals,
    updateSuggestedHospitals,
    fetchAllHospitals,
    loading,
    error: contextError
  } = useSuggestedHospitals();
  const [showAll, setShowAll] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch nearby hospitals (suggested) or all hospitals on toggle
  useEffect(() => {
    if (showAll) {
      fetchAllHospitals();
    } else {
      if (connectionId) {
        updateSuggestedHospitals(connectionId);
      } else {
        updateSuggestedHospitals();
      }
    }
    // eslint-disable-next-line
  }, [showAll, connectionId]);

  const hospitalsToShow = showAll ? allHospitals : suggestedHospitals;

  const filteredHospitals = hospitalsToShow.filter(hospital => {
    const matchesSearch =
      hospital.name.toLowerCase().includes(search.toLowerCase()) ||
      hospital.address.toLowerCase().includes(search.toLowerCase()) ||
      hospital.city.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Calculate map center (average of all hospital locations, fallback to Cyprus center)
  const validHospitals = filteredHospitals.filter(h => typeof h.latitude === 'number' && typeof h.longitude === 'number');
  const mapCenter = validHospitals.length > 0
    ? [
        validHospitals.reduce((sum, h) => sum + (h.latitude ?? defaultCenter.lat), 0) / validHospitals.length,
        validHospitals.reduce((sum, h) => sum + (h.longitude ?? defaultCenter.lng), 0) / validHospitals.length,
      ]
    : [defaultCenter.lat, defaultCenter.lng];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Hospitals</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            {showAll ? 'Show Nearby' : 'Show All'}
          </button>
          <button
            onClick={() => setShowMap(!showMap)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            {showMap ? 'Show List' : 'Show Map'}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search hospitals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {contextError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {contextError}
        </div>
      )}

      {!loading && filteredHospitals.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          {showAll
            ? 'No hospitals found.'
            : 'No nearby hospitals found. Try viewing all hospitals.'}
        </div>
      )}

      {showMap ? (
        <div className="my-6 rounded-lg overflow-hidden shadow-lg">
          <MapContainer
            center={mapCenter as [number, number]}
            zoom={10}
            style={mapContainerStyle}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {validHospitals.map(hospital => (
              <Marker
                key={hospital.id}
                position={[hospital.latitude ?? defaultCenter.lat, hospital.longitude ?? defaultCenter.lng]}
                icon={defaultIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-blue-900">{hospital.name}</h3>
                    <p className="text-gray-600 text-sm">{hospital.address}, {hospital.city}</p>
                    {hospital.phone && <p className="text-gray-600 text-sm">{hospital.phone}</p>}
                    {hospital.distance && <p className="text-blue-600 text-xs">{hospital.distance.toFixed(1)} km away</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHospitals.map(hospital => (
            <div key={hospital.id} className="bg-blue-50 rounded-lg p-5 shadow hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">{hospital.name}</h3>
                    <p className="text-gray-600 text-sm">{hospital.address}</p>
                    <p className="text-gray-600 text-sm">{hospital.city}</p>
                  </div>
                </div>
                {hospital.distance && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-gray-600">{hospital.distance.toFixed(1)} km</span>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {hospital.phone && (
                  <p className="text-gray-600 text-sm flex items-center">
                    <span className="font-medium">Phone:</span> {hospital.phone}
                  </p>
                )}
                {hospital.specialties && (
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(hospital.specialties) 
                      ? hospital.specialties.map((specialty: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {specialty.trim()}
                          </span>
                        ))
                      : null}
                  </div>
                )}
                {hospital.latitude && hospital.longitude && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${hospital.latitude}&mlon=${hospital.longitude}#map=15/${hospital.latitude}/${hospital.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    View on Map
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestedHospitalsPage; 