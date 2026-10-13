from django.db import models


class SavedAnalysis(models.Model):
    """Immutable server-produced arrival-weather snapshot; access requires its token."""
    token_hash = models.CharField(max_length=64, unique=True)
    analysis = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    policy_version = models.CharField(max_length=40, default="weather-risk-v1")
