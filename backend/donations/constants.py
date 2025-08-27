from enum import Enum

class OrganType(Enum):
    KIDNEY = 'kidney'
    LIVER = 'liver'
    HEART = 'heart'
    LUNG = 'lung'
    PANCREAS = 'pancreas'
    INTESTINE = 'intestine'
    CORNEA = 'cornea'
    SKIN = 'skin'
    BONE = 'bone'
    BONE_MARROW = 'bone_marrow'

    @classmethod
    def choices(cls):
        return [(e.value, e.name.title()) for e in cls]

class BloodType(Enum):
    A_POSITIVE = 'A+'
    A_NEGATIVE = 'A-'
    B_POSITIVE = 'B+'
    B_NEGATIVE = 'B-'
    AB_POSITIVE = 'AB+'
    AB_NEGATIVE = 'AB-'
    O_POSITIVE = 'O+'
    O_NEGATIVE = 'O-'

    @classmethod
    def choices(cls):
        return [(e.value, e.value) for e in cls]

class RequestStatus(Enum):
    OPEN = 'open'
    MATCHED = 'matched'
    FULFILLED = 'fulfilled'
    CANCELLED = 'cancelled'

    @classmethod
    def choices(cls):
        return [(e.value, e.name.title()) for e in cls]

class UrgencyLevel(Enum):
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'

    @classmethod
    def choices(cls):
        return [(e.value, e.name.title()) for e in cls]

    @classmethod
    def scores(cls):
        return {
            cls.CRITICAL.value: 4,
            cls.HIGH.value: 3,
            cls.MEDIUM.value: 2,
            cls.LOW.value: 1
        }

# Updated blood type compatibility matrix
BLOOD_TYPE_COMPATIBILITY = {
    'O-': ['O-'],  # Can only receive from O-
    'O+': ['O-', 'O+'],  # Can receive from O- and O+
    'A-': ['O-', 'A-'],  # Can receive from O- and A-
    'A+': ['O-', 'O+', 'A-', 'A+'],  # Can receive from O-, O+, A-, A+
    'B-': ['O-', 'B-'],  # Can receive from O- and B-
    'B+': ['O-', 'O+', 'B-', 'B+'],  # Can receive from O-, O+, B-, B+
    'AB-': ['O-', 'A-', 'B-', 'AB-'],  # Universal recipient (negative)
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']  # Universal recipient (positive)
}

# Matching constants
MATCHING_CONSTANTS = {
    'FACTOR_WEIGHTS': {
        'BLOOD_TYPE': 0.4,
        'AGE': 0.2,
        'HEIGHT': 0.1,
        'WEIGHT': 0.1,
        'LOCATION': 0.2
    },
    'MIN_MATCH_SCORE': 60,  # Minimum score to be considered a match
    'HIGH_MATCH_SCORE': 85,  # Score threshold for high-potential matches
    'LOCATION_MATCH_THRESHOLD': 50,  # Maximum distance in kilometers for a good location match
    'MAX_AGE_DIFF': 20,  # Maximum allowed age difference between donor and recipient
    'MAX_HEIGHT_DIFF': 10,  # Maximum allowed height difference in cm
    'MAX_WEIGHT_DIFF': 20,  # Maximum allowed weight difference in kg
    'LOCATION_WEIGHTS': {
        'SAME_CITY': 1.0,
        'SAME_COUNTRY': 0.7,
        'FAR_COUNTRY': 0.3
    }
}

EARTH_RADIUS_KM = 6371  # Earth's radius in kilometers

# Cache timeouts in seconds
CACHE_TTL = {
    'organ_list': 60 * 5,  # 5 minutes
    'organ_detail': 60 * 5,  # 5 minutes
    'donation_request_list': 60 * 5,  # 5 minutes
    'donation_request_detail': 60 * 5,  # 5 minutes
    'recipient_request_list': 60 * 5,  # 5 minutes
    'recipient_request_detail': 60 * 5,  # 5 minutes
    'connection_list': 60 * 5,  # 5 minutes
    'connection_detail': 60 * 5,  # 5 minutes
} 