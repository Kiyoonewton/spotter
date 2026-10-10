from django.test import SimpleTestCase

from core.routing import RoutingProviderError, normalize_routes


POLYLINE = "BGwynmkDu39wZvBtF3InfvHrdvHvboGzF0FnGoGvHsOvR8L3NkSvWoGvHsEzFgFvHkD3IwHrJwHrJgKjN4D_E0ezoBjInV3N_iBzJ_Z"


def route(route_id, polyline=POLYLINE):
    return {"id": route_id, "sections": [{"polyline": polyline, "summary": {"length": 1000, "duration": 120}}]}


class RoutingNormalizationTests(SimpleTestCase):
    def test_decodes_official_flexible_polyline(self):
        result = normalize_routes({"routes": [route("here-1")]})
        self.assertEqual(result[0].provider_id, "here-1")
        self.assertGreater(len(result[0].coordinates), 2)
        self.assertAlmostEqual(result[0].coordinates[0][0], 52.530984, places=5)

    def test_returns_fewer_routes_and_removes_duplicates(self):
        result = normalize_routes({"routes": [route("one"), route("duplicate")]})
        self.assertEqual([item.provider_id for item in result], ["one"])

    def test_rejects_malformed_geometry_and_no_routes(self):
        with self.assertRaises(RoutingProviderError):
            normalize_routes({"routes": [route("bad", "not-a-polyline")]})
        with self.assertRaisesMessage(RoutingProviderError, "no usable"):
            normalize_routes({"routes": []})
