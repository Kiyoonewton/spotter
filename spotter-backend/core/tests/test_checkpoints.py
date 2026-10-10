from datetime import datetime

from django.test import SimpleTestCase

from core.checkpoints import sample_route
from core.routing import NormalizedRoute


def route(distance_miles=52.0):
    return NormalizedRoute(
        "route-A",
        [(41.0, -87.0), (41.0, -86.5), (41.5, -86.5)],
        distance_miles / 0.000621371192,
        3600,
        [],
    )


class CheckpointSamplingTests(SimpleTestCase):
    def test_bent_route_exact_and_partial_intervals(self):
        checkpoints, segments, totals = sample_route(route(), 25, "2026-11-01T23:50:00-05:00")
        self.assertEqual([round(item.distance_miles) for item in checkpoints], [0, 25, 50, 52])
        self.assertNotEqual(checkpoints[1].coordinates[0], checkpoints[1].coordinates[1])
        self.assertEqual(len(segments), 3)
        self.assertAlmostEqual(sum(segment.distance_miles for segment in segments), 52.0, places=5)
        self.assertTrue(checkpoints[-1].arrival_at.startswith("2026-11-02T"))
        self.assertEqual(totals["timing_method"], "distance_proportional_estimate")

    def test_duplicate_coordinates_and_route_ownership(self):
        sampled = route()
        sampled = NormalizedRoute(sampled.provider_id, [sampled.coordinates[0], sampled.coordinates[0], *sampled.coordinates[1:]], sampled.distance_meters, sampled.duration_seconds, [])
        checkpoints, segments, _ = sample_route(sampled, 50, "2026-07-01T12:00:00+02:00")
        self.assertTrue(all(item.route_id == "route-A" for item in checkpoints + segments))
        self.assertEqual(checkpoints[-1].distance_miles, 52)
        self.assertEqual(checkpoints[-1].arrival_at, "2026-07-01T12:49:00Z")

    def test_requires_offset_aware_departure(self):
        with self.assertRaises(ValueError):
            sample_route(route(), 10, "2026-07-01T12:00:00")
