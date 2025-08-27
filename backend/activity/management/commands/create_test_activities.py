from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from activity.models import UserActivity
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates test activity data for all users'

    def handle(self, *args, **options):
        # Get all users
        users = User.objects.all()
        
        if not users.exists():
            self.stdout.write(self.style.WARNING('No users found in the database. Please create users first.'))
            return

        # Sample activities
        activities = [
            'Logged in to the system',
            'Viewed organ listings',
            'Created a new organ listing',
            'Updated profile information',
            'Sent a message to a donor',
            'Received a new message',
            'Updated organ listing status',
            'Completed a donation request'
        ]

        # Create activities for each user
        for user in users:
            for action in activities:
                UserActivity.objects.create(
                    user=user,
                    action=action
                )
                self.stdout.write(f'Created activity for {user.username}: {action}')

        self.stdout.write(self.style.SUCCESS('Successfully created test activity data')) 