from datetime import timedelta
from unittest.mock import patch
from django.core.management import call_command
from django.db import DatabaseError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from core.models import SavedAnalysis


class SnapshotTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.inputs = {"mode": "demo", "origin": "Chicago, IL", "destination": "Pittsburgh, PA",
                       "departure_at": "2026-10-12T10:00:00-05:00", "departure_timezone": "America/Chicago",
                       "load_weight_lb": 42000, "checkpoint_spacing_miles": 25, "save_snapshot": True}

    def test_save_and_restore_are_server_owned_and_do_not_call_providers(self):
        result = self.client.post("/api/trip-analyses/", self.inputs, format="json").data
        token = result["snapshot"]["token"]
        self.assertEqual(len(token), 64)
        record = SavedAnalysis.objects.get()
        self.assertNotIn(token, str(record.analysis))
        with patch("core.views.analyze_live") as live, patch("core.views.analyze_trip") as demo:
            response = self.client.post("/api/saved-analyses/restore/", {"token": token}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, result)
        self.assertEqual(response["Cache-Control"], "no-store")
        live.assert_not_called()
        demo.assert_not_called()
        self.assertEqual(record.analysis["applied_request"]["load_weight_lb"], 42000)

    def test_missing_invalid_and_expired_tokens_are_not_enumerable(self):
        result = self.client.post("/api/trip-analyses/", self.inputs, format="json").data
        SavedAnalysis.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        for token in (result["snapshot"]["token"], "a" * 64, "invalid", None):
            response = self.client.post("/api/saved-analyses/restore/", {"token": token}, format="json")
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.data["code"], "snapshot_unavailable")
        self.assertEqual(self.client.get("/api/saved-analyses/restore/").status_code, 405)
        call_command("purge_saved_analyses", verbosity=0)
        self.assertEqual(SavedAnalysis.objects.count(), 0)

    def test_saving_failure_preserves_analysis_without_leaking_secrets(self):
        with patch("core.snapshots.SavedAnalysis.objects.create", side_effect=DatabaseError("secret-provider-url")):
            with self.assertLogs("core.snapshots", level="WARNING") as logs:
                response = self.client.post("/api/trip-analyses/", self.inputs, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["routes"]), 3)
        self.assertNotIn("snapshot", response.data)
        self.assertNotIn("secret-provider-url", str(response.data) + str(logs.output))

    def test_opt_in_and_validation(self):
        response = self.client.post("/api/trip-analyses/", {**self.inputs, "save_snapshot": False}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(SavedAnalysis.objects.count(), 0)
        response = self.client.post("/api/trip-analyses/", {**self.inputs, "save_snapshot": "true"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_restore_database_failure_has_safe_diagnostics(self):
        with patch("core.snapshots.SavedAnalysis.objects.filter", side_effect=DatabaseError("FAKE_KEY internal URL")):
            with self.assertLogs("core.snapshots", level="WARNING") as logs:
                response = self.client.post("/api/saved-analyses/restore/", {"token": "a" * 64}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "snapshot_restore_unavailable")
        from uuid import UUID
        UUID(response.data["request_id"])
        self.assertNotIn("FAKE_KEY", str(response.data) + str(logs.output))

    def test_live_snapshot_preserves_provider_result_and_null_recommendation(self):
        result = {"analysis_id": "owned", "data_source": "live", "routes": [],
                  "recommendation": {"status": "unavailable", "recommended_route_id": None, "explanation": "Incomplete"}}
        inputs = {**self.inputs, "mode": "live", "origin": "New York", "destination": "Boston",
                  "origin_coordinates": {"lat": 40.7, "lon": -74}, "destination_coordinates": {"lat": 42.3, "lon": -71.1}}
        with patch("core.views.analyze_live", return_value=result):
            response = self.client.post("/api/trip-analyses/", inputs, format="json")
        restored = self.client.post("/api/saved-analyses/restore/", {"token": response.data["snapshot"]["token"]}, format="json")
        self.assertEqual(restored.data["analysis_id"], "owned")
        self.assertIsNone(restored.data["recommendation"]["recommended_route_id"])
        self.assertEqual(restored.data["applied_request"]["origin"], "New York")
