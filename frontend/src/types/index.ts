export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  specialties: string[];
  distance?: number; // in kilometers
  rating?: number; // 1-5 scale
  latitude?: number;
  longitude?: number;
} 