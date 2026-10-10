from django.test import SimpleTestCase

from unittest.mock import patch
from io import BytesIO

from core.providers import ProviderError, search_locations


class LocationSearchTests(SimpleTestCase):
    def test_demo_search_returns_normalized_candidates(self):
        result = search_locations("chicago")
        self.assertEqual(result[0].provider_id, "demo:chicago")
        self.assertEqual(result[0].timezone, "America/Chicago")

    def test_search_is_bounded_by_query(self):
        self.assertEqual(search_locations("not a city"), [])

    @patch.dict("os.environ", {"OPENCAGE_API_KEY": "test-key"})
    @patch("core.providers.urlopen")
    def test_normalizes_opencage_response_and_limits_results(self, urlopen):
        payload = {"status": {"code": 200}, "results": [{
            "formatted": "Chicago, Illinois, United States",
            "geometry": {"lat": 41.8781, "lng": -87.6298},
            "annotations": {"timezone": {"name": "America/Chicago"}},
        }] * 8}
        response = BytesIO(__import__("json").dumps(payload).encode())
        response.__enter__ = lambda: response
        response.__exit__ = lambda *_: None
        urlopen.return_value = response
        result = search_locations("Chicago", mode="live")
        self.assertEqual(len(result), 5)
        self.assertEqual(result[0].provider_id, "opencage:41.878100:-87.629800")

    @patch.dict("os.environ", {"OPENCAGE_API_KEY": ""})
    def test_live_requires_provider_configuration(self):
        with self.assertRaisesMessage(ProviderError, "OPENCAGE_API_KEY"):
            search_locations("Chicago", mode="live")
