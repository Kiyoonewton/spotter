"""Optional HERE span timing aligned to decoded geometry; fail closed to estimates."""
from bisect import bisect_left
from math import isfinite

from .route_geometry import geodesic_distance


def _number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value) or value < 0:
        raise ValueError
    return value


def build_span_timing(sections, shapes):
    """Return (geometry fraction, cumulative seconds), or None for unusable spans.

    Allow only small duration rounding differences (max 2s or 1% per section),
    rescaled within that section so its reported arrival remains exact.
    """
    try:
        anchors = [(0.0, 0.0)]
        geometry_total = elapsed_total = 0.0
        previous_end = None
        for section, points in zip(sections, shapes):
            if previous_end is not None and previous_end != points[0]:
                return None
            previous_end = points[-1]
            distances = [0.0]
            for start, end in zip(points, points[1:]):
                distances.append(distances[-1] + geodesic_distance(start, end))
            spans = section.get("spans")
            if not isinstance(spans, list) or not spans or distances[-1] <= 0:
                return None
            offsets = [span["offset"] for span in spans]
            if (any(isinstance(offset, bool) or not isinstance(offset, int) for offset in offsets)
                    or offsets[0] != 0 or offsets != sorted(set(offsets))
                    or offsets[-1] >= len(points)):
                return None
            durations = [_number(span["duration"]) for span in spans]
            lengths = [_number(span["length"]) for span in spans]
            reported_duration = _number(section["summary"]["duration"])
            reported_length = _number(section["summary"]["length"])
            total_duration = sum(durations)
            if (total_duration <= 0 or reported_duration <= 0 or reported_length <= 0
                    or abs(total_duration - reported_duration) > max(2, reported_duration * .01)
                    or abs(sum(lengths) - reported_length) > max(2, reported_length * .01)):
                return None
            section_elapsed = 0.0
            for index, offset in enumerate(offsets):
                end_offset = offsets[index + 1] if index + 1 < len(offsets) else len(points) - 1
                if distances[end_offset] == distances[offset]:
                    if durations[index] != 0 or lengths[index] != 0:
                        return None
                    continue
                if lengths[index] <= 0:
                    return None
                section_elapsed += durations[index] * reported_duration / total_duration
                anchors.append((geometry_total + distances[end_offset], elapsed_total + section_elapsed))
            geometry_total += distances[-1]
            elapsed_total += reported_duration
            # Force exact section totals after bounded rounding reconciliation.
            anchors[-1] = (geometry_total, elapsed_total)
        if geometry_total <= 0 or len(anchors) < 2:
            return None
        return [(distance / geometry_total, seconds) for distance, seconds in anchors]
    except (KeyError, TypeError, ValueError, IndexError):
        return None


def elapsed_at_fraction(profile, fraction, duration_seconds):
    if not profile:
        return duration_seconds * fraction
    if fraction <= 0:
        return 0.0
    if fraction >= 1:
        return float(duration_seconds)
    index = bisect_left(profile, fraction, key=lambda anchor: anchor[0])
    start, elapsed_start = profile[index - 1]
    end, elapsed_end = profile[index]
    ratio = (fraction - start) / (end - start)
    return elapsed_start + ratio * (elapsed_end - elapsed_start)
