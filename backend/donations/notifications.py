from backend.notifications.utils import create_notification

def notify_potential_match(organ_match):
    """
    Send notification for a potential organ match
    """
    if organ_match.match_score >= 70:
        create_notification(
            recipient=organ_match.recipient_request.recipient,
            notification_type='match',
            title='New Potential Match Found',
            message=f"A {organ_match.organ.organ_name} has been found with a {organ_match.match_score}% match score for your request.",
            related_object_id=organ_match.id,
            urgency_level='HIGH'
        )