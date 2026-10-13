"""Explicit vehicle measurements, separate from cargo-based weather risk."""
from decimal import Decimal, ROUND_CEILING
import math

LIMITS = {"height_ft": 25, "width_ft": 25, "length_ft": 200,
          "current_weight_lb": 500000, "gross_weight_lb": 500000, "weight_per_axle_lb": 200000}


class TruckProfileError(ValueError):
    pass


def validate_truck_profile(value, cargo_weight=None):
    if not isinstance(value, dict) or set(value) != set(LIMITS):
        raise TruckProfileError("Provide all six supported measurements.")
    for name, maximum in LIMITS.items():
        number = value[name]
        if isinstance(number, bool) or not isinstance(number, (int, float)) or not 0 < number <= maximum or not math.isfinite(number):
            raise TruckProfileError("Invalid vehicle measurement.")
    if value["current_weight_lb"] > value["gross_weight_lb"]:
        raise TruckProfileError("Loaded vehicle weight exceeds rated gross weight.")
    if value["weight_per_axle_lb"] > value["current_weight_lb"]:
        raise TruckProfileError("Axle weight exceeds total vehicle weight.")
    if cargo_weight is not None and value["current_weight_lb"] <= cargo_weight:
        raise TruckProfileError("Loaded vehicle weight must exceed cargo weight.")
    return dict(value)


def vehicle_parameters(value):
    if value is None:
        return {}
    profile = validate_truck_profile(value)
    def convert(name, factor):
        return int((Decimal(str(profile[name])) * Decimal(factor)).to_integral_value(rounding=ROUND_CEILING))
    return {"vehicle[height]": convert("height_ft", "30.48"),
            "vehicle[width]": convert("width_ft", "30.48"),
            "vehicle[length]": convert("length_ft", "30.48"),
            "vehicle[currentWeight]": convert("current_weight_lb", "0.45359237"),
            "vehicle[grossWeight]": convert("gross_weight_lb", "0.45359237"),
            "vehicle[weightPerAxle]": convert("weight_per_axle_lb", "0.45359237")}


def critical_provider_notice(route, sections):
    critical = False
    for item in [route, *sections]:
        notices = item.get("notices", [])
        if not isinstance(notices, list) or any(not isinstance(notice, dict) or notice.get("severity") not in {"critical", "info", "warning"} for notice in notices):
            raise ValueError("Malformed provider notices.")
        critical = critical or any(notice.get("severity") == "critical" for notice in notices)
    return critical
