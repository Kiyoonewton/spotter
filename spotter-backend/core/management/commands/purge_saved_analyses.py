from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import SavedAnalysis


class Command(BaseCommand):
    help = "Delete expired saved analyses. Run daily to enforce snapshot retention."

    def handle(self, *args, **options):
        count, _ = SavedAnalysis.objects.filter(expires_at__lte=timezone.now()).delete()
        self.stdout.write(f"Deleted {count} expired saved analyses.")
