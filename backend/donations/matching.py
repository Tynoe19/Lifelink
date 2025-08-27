from typing import Dict, List, Tuple
from django.db.models import Q
from django.db import transaction
from django.apps import apps
from .constants import (
    BLOOD_TYPE_COMPATIBILITY,
    MATCHING_CONSTANTS
)
from .notifications import notify_potential_match
import logging

logger = logging.getLogger(__name__)

class MatchResult:
    def __init__(self, organ, match_score: float, match_details: Dict):
        self.organ = organ
        self.match_score = match_score
        self.match_details = match_details

class MatchCalculator:
    def calculate_blood_type_score(self, donor_blood_type: str, recipient_blood_type: str) -> float:
        """Calculate blood type compatibility score"""
        if donor_blood_type in BLOOD_TYPE_COMPATIBILITY.get(recipient_blood_type, []):
            return 1.0
        return 0.0

    def calculate_age_score(self, donor_age: int, recipient_age: int) -> float:
        """Calculate age compatibility score"""
        age_diff = abs(donor_age - recipient_age)
        if age_diff > MATCHING_CONSTANTS['MAX_AGE_DIFF']:
            return 0.0
        return 1 - (age_diff / MATCHING_CONSTANTS['MAX_AGE_DIFF'])

    def calculate_height_score(self, donor_height: float, recipient_height: float) -> float:
        """Calculate height compatibility score"""
        height_diff = abs(donor_height - recipient_height)
        if height_diff > MATCHING_CONSTANTS['MAX_HEIGHT_DIFF']:
            return 0.0
        return 1 - (height_diff / MATCHING_CONSTANTS['MAX_HEIGHT_DIFF'])

    def calculate_weight_score(self, donor_weight: float, recipient_weight: float) -> float:
        """Calculate weight compatibility score"""
        weight_diff = abs(donor_weight - recipient_weight)
        if weight_diff > MATCHING_CONSTANTS['MAX_WEIGHT_DIFF']:
            return 0.0
        return 1 - (weight_diff / MATCHING_CONSTANTS['MAX_WEIGHT_DIFF'])

    def calculate_location_score(self, donor_location: str, recipient_location: str) -> float:
        """Calculate location compatibility score"""
        donor_city, donor_country = donor_location.split(',')
        recipient_city, recipient_country = recipient_location.split(',')
        
        if donor_city.strip() == recipient_city.strip():
            return MATCHING_CONSTANTS['LOCATION_WEIGHTS']['SAME_CITY']
        elif donor_country.strip() == recipient_country.strip():
            return MATCHING_CONSTANTS['LOCATION_WEIGHTS']['SAME_COUNTRY']
        return MATCHING_CONSTANTS['LOCATION_WEIGHTS']['FAR_COUNTRY']

@transaction.atomic
def find_matches(recipient_request) -> List[MatchResult]:
    """Find potential matches for a recipient request and store them in the database"""
    matches = []
    
    # Get models using apps.get_model to avoid circular imports
    Organ = apps.get_model('donations', 'Organ')
    OrganMatch = apps.get_model('donations', 'OrganMatch')
    
    # Get compatible organs
    compatible_organs = Organ.objects.filter(
        is_available=True,
        organ_name=recipient_request.organ_type
    )
    
    # Get existing matches
    existing_matches = OrganMatch.objects.filter(recipient_request=recipient_request)
    existing_match_ids = set(existing_matches.values_list('organ_id', flat=True))
    
    calculator = MatchCalculator()
    
    for organ in compatible_organs:
        # Skip if we already have a match for this organ
        if organ.id in existing_match_ids:
            continue
            
        # Calculate individual scores
        blood_score = calculator.calculate_blood_type_score(organ.blood_type, recipient_request.blood_type)
        age_score = calculator.calculate_age_score(organ.donor.age, recipient_request.recipient.age)
        height_score = calculator.calculate_height_score(organ.donor.height, recipient_request.recipient.height)
        weight_score = calculator.calculate_weight_score(organ.donor.weight, recipient_request.recipient.weight)
        location_score = calculator.calculate_location_score(organ.location, recipient_request.location)
        
        # Calculate weighted total score
        total_score = (
            blood_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['BLOOD_TYPE'] +
            age_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['AGE'] +
            height_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['HEIGHT'] +
            weight_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['WEIGHT'] +
            location_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['LOCATION']
        ) * 100
        
        # Create match details
        match_details = {
            'blood_type_match': {
                'score': blood_score * 100,
                'compatible': blood_score > 0
            },
            'age_match': {
                'score': age_score * 100,
                'difference': abs(organ.donor.age - recipient_request.recipient.age)
            },
            'height_match': {
                'score': height_score * 100,
                'difference': abs(organ.donor.height - recipient_request.recipient.height)
            },
            'weight_match': {
                'score': weight_score * 100,
                'difference': abs(organ.donor.weight - recipient_request.recipient.weight)
            },
            'location_match': {
                'score': location_score * 100,
                'distance': 'Same City' if location_score == 1.0 else 'Same Country' if location_score >= 0.7 else 'Far'
            }
        }
        
        # Store match in database
        organ_match = OrganMatch.objects.create(
            organ=organ,
            recipient_request=recipient_request,
            match_score=round(total_score, 2),
            blood_type_match=match_details['blood_type_match'],
            age_match=match_details['age_match'],
            height_match=match_details['height_match'],
            weight_match=match_details['weight_match'],
            location_match=match_details['location_match']
        )
        
        # Send notification for high-potential matches
        if total_score >= 70:
            notify_potential_match(organ_match)
        
        matches.append(MatchResult(organ, total_score, match_details))
    
    # Sort matches by score in descending order
    matches.sort(key=lambda x: x.match_score, reverse=True)
    return matches 