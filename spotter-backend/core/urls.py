from django.urls import path

from .departure_views import departure_comparisons
from .snapshots import restore_analysis
from . import views
from .readiness import readiness
from .forecast_views import corridor_forecasts

urlpatterns = [
    path("departure-comparisons/", departure_comparisons, name="departure-comparisons"),
    path("saved-analyses/restore/", restore_analysis, name="restore-analysis"),
    path("health", views.health, name="health"),
    path("ready", readiness, name="readiness"),
    path("locations/", views.locations, name="locations"),
    path("corridor-forecasts/", corridor_forecasts, name="corridor-forecasts"),
    path("trip-analyses/", views.trip_analyses, name="trip-analyses"),
]
