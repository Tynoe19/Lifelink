import { Hospital } from '../types';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

interface OSMHospital {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags: {
    name: string;
    'addr:street'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    phone?: string;
    website?: string;
    amenity: string;
  };
}

interface LocationParams {
  latitude: number;
  longitude: number;
  radius: number; // in kilometers, now required
}

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const fetchTRNCHospitals = async (locationParams?: LocationParams): Promise<Hospital[]> => {
  // Cyprus island bounding box coordinates
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](34.5,32.0,35.5,34.5);
      way["amenity"="hospital"](34.5,32.0,35.5,34.5);
      relation["amenity"="hospital"](34.5,32.0,35.5,34.5);
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch hospitals from OpenStreetMap');
    }

    const data = await response.json();
    
    // Check if data and elements exist
    if (!data || !data.elements || !Array.isArray(data.elements)) {
      console.warn('Invalid response format from OpenStreetMap API');
      return [];
    }

    let hospitals: Hospital[] = data.elements
      .filter((element: OSMHospital) => 
        element && 
        element.type === 'node' && 
        element.tags && 
        element.tags.name && 
        typeof element.lat === 'number' && 
        typeof element.lon === 'number'
      )
      .map((element: OSMHospital) => ({
        id: element.id.toString(),
        name: element.tags.name,
        address: element.tags['addr:street'] || 'Address not available',
        city: element.tags['addr:city'] || 'Cyprus',
        phone: element.tags.phone || 'Phone not available',
        specialties: ['General Medicine'], // Default specialty
        latitude: element.lat,
        longitude: element.lon,
      }));

    // If location parameters are provided, filter hospitals by distance
    if (locationParams) {
      const { latitude, longitude, radius = 30 } = locationParams;
      hospitals = hospitals
        .map(hospital => ({
          ...hospital,
          distance: calculateDistance(
            latitude,
            longitude,
            hospital.latitude as number,
            hospital.longitude as number
          )
        }))
        .filter(hospital => hospital.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }

    console.log('Fetched hospitals:', hospitals); // Debug log
    return hospitals;
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    throw error;
  }
}; 