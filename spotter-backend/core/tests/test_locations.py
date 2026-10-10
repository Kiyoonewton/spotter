from django.test import SimpleTestCase

from core.providers import search_locations


class LocationSearchTests(SimpleTestCase):
    def test_demo_search_returns_normalized_candidates(self):
        result = search_locations("chicago")
        self.assertEqual(result[0].provider_id, "demo:chicago")
        self.assertEqual(result[0].timezone, "America/Chicago")

    def test_search_is_bounded_by_query(self):
        self.assertEqual(search_locations("not a city"), [])
