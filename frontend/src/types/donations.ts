export interface Organ {
    id: number;
    organ_name: string;
    blood_type: string;
    location: string;
    is_available: boolean;
    additional_notes?: string;
    donor: {
        id: number;
        fullname: string;
        gender: string;
        age: number;
        blood_type: string;
        urgency_level?: string | null;
        city?: string;
        country?: {
            code: string;
            name: string;
        };
    };
    match_score?: number;
    match_details?: {
        blood_type_match: {
            score: number;
            compatible: boolean;
        };
        age_match: {
            score: number;
            difference: number;
        };
        height_match: {
            score: number;
            difference: number;
        };
        weight_match: {
            score: number;
            difference: number;
        };
        location_match: {
            score: number;
            distance: string;
        };
    };
    date_created: string;
    date_updated: string;
}

export interface MatchResponse {
    matches: Array<{
        id: number;
        organ: Organ;
        match_score: number;
        match_details: {
            blood_type_match: {
                score: number;
                compatible: boolean;
            };
            age_match: {
                score: number;
                difference: number;
            };
            height_match: {
                score: number;
                difference: number;
            };
            weight_match: {
                score: number;
                difference: number;
            };
            location_match: {
                score: number;
                distance: string;
            };
        };
        is_notified: boolean;
        date_created: string;
        date_updated: string;
    }>;
    total_matches: number;
} 