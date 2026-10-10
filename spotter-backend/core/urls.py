from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health, name="health"),
    path("locations/", views.locations, name="locations"),
    path("trip-analyses/", views.trip_analyses, name="trip-analyses"),
]
