from math import sin, cos, sqrt, atan2, radians
from django.utils import timezone
from .constants import EARTH_RADIUS_KM

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two points using the Haversine formula.
    
    Args:
        lat1, lon1: Coordinates of first point
        lat2, lon2: Coordinates of second point
    
    Returns:
        Distance in kilometers
    """
    if None in (lat1, lon1, lat2, lon2):
        return None
        
    lat1, lon1 = radians(float(lat1)), radians(float(lon1))
    lat2, lon2 = radians(float(lat2)), radians(float(lon2))
    
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return EARTH_RADIUS_KM * c

def get_location_match_score(location, city, country):
    """
    Calculate location match score based on city and country.
    
    Args:
        location: Location string to check
        city: City to match
        country: Country to match
    
    Returns:
        Score (2 for city match, 1 for country match, 0 for no match)
    """
    if not city or not country:
        return 0
        
    location = location.lower()
    if city.lower() in location:
        return 2
    elif country.lower() in location:
        return 1
    return 0

def get_organ_age(created_at):
    """
    Calculate how long an organ has been listed.
    
    Args:
        created_at: Creation datetime of the organ listing
    
    Returns:
        Time delta between now and creation
    """
    return timezone.now() - created_at 

def find_matches(request):
    """
    Placeholder for the organ-recipient matching logic.
    Currently does nothing. Implement matching logic here.
    """
    pass 