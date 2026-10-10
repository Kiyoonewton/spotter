from django.urls import path

from . import views
from .forecast_views import corridor_forecasts

urlpatterns = [
    path("health", views.health, name="health"),
    path("locations/", views.locations, name="locations"),
    path("corridor-forecasts/", corridor_forecasts, name="corridor-forecasts"),
    path("trip-analyses/", views.trip_analyses, name="trip-analyses"),
]
