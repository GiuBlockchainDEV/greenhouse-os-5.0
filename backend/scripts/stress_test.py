#!/usr/bin/env python3
"""
GreenhouseOS stress test — validates REST and WebSocket latency targets.

Usage:
    python scripts/stress_test.py [--base-url http://localhost:8000] [--iterations 100]
"""

import argparse
import asyncio
import json
import statistics
import time
import uuid

import httpx
import websockets

SIMULATION_PAYLOAD = {
    "climate": {
        "latitude_deg": 41.9028,
        "longitude_deg": 12.4964,
        "temperature_max_c": 34.0,
        "temperature_min_c": 22.0,
        "relative_humidity_pct": 72.0,
        "wind_speed_m_s": 2.5,
    },
    "covering": {"type": "glass", "transmittance": 0.85, "u_value": 5.8},
    "crop_type": "tomato",
    "growth_stage": "mid_season",
}

WS_PAYLOAD = {
    "event": "UPDATE_SIMULATION",
    "data": {
        "location": {"lat": 41.9028, "lon": 12.4964},
        "geometry": {"length": 30, "width": 20, "ridge_height": 5.0, "eave_height": 3.0, "bay_count": 2, "bay_width_m": 10, "arch_type": "semicircular", "bay_arch_types": ["semicircular", "semicircular"]},
        "materials": {"covering_type": "glass", "transmittance": 0.85, "u_value": 5.8},
        "crop": {
            "type": "tomato",
            "system": "nft",
            "lai": 3.2,
            "growth_stage": "mid_season",
            "layout": {
                "tier_count": 2,
                "gutter_length_m": 30,
                "plants_per_tier": 120,
                "aisle_width_m": 0.8,
            },
        },
        "equipment": {
            "cooling": "fan_and_pad",
            "heating": "hot_water_pipes",
            "ventilation": "roof_vents",
        },
    },
}


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = int(len(sorted_vals) * pct / 100)
    return sorted_vals[min(idx, len(sorted_vals) - 1)]


async def stress_rest(base_url: str, iterations: int) -> list[float]:
    latencies: list[float] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for _ in range(iterations):
            start = time.perf_counter()
            response = await client.post(
                f"{base_url}/api/v1/simulation/run",
                json=SIMULATION_PAYLOAD,
            )
            response.raise_for_status()
            latencies.append((time.perf_counter() - start) * 1000)
    return latencies


async def stress_websocket(base_url: str, iterations: int) -> list[float]:
    ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://")
    latencies: list[float] = []

    async with websockets.connect(f"{ws_url}/ws/simulation") as ws:
        for _ in range(iterations):
            start = time.perf_counter()
            await ws.send(json.dumps(WS_PAYLOAD))
            await ws.recv()
            latencies.append((time.perf_counter() - start) * 1000)

    return latencies


async def stress_export(base_url: str, iterations: int) -> list[float]:
    latencies: list[float] = []
    payload = {
        "format": "priva",
        "greenhouse_name": "Stress Test",
        "internal_temp_c": 28.0,
        "internal_rh_pct": 72.0,
        "vpd_kpa": 1.2,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        for _ in range(iterations):
            start = time.perf_counter()
            response = await client.post(
                f"{base_url}/api/v1/export/climate-computer",
                json=payload,
            )
            response.raise_for_status()
            latencies.append((time.perf_counter() - start) * 1000)
    return latencies


async def stress_greenhouse_crud(base_url: str, iterations: int) -> list[float]:
    latencies: list[float] = []
    user_id = str(uuid.uuid4())
    headers = {"X-User-Id": user_id}
    create_body = {
        "name": "Stress Test GH",
        "latitude": 41.9,
        "longitude": 12.5,
        "dimensions": {"length": 30, "width": 10, "ridge_height": 4.5, "eave_height": 3},
        "covering_material": {"type": "glass", "transmittance": 0.85, "u_value": 5.8},
        "crop_config": {
            "crop_type": "tomato",
            "cultivation_system": "hydroponic_nft",
            "lai": 3.2,
            "growth_stage": "mid_season",
        },
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        for _ in range(iterations):
            start = time.perf_counter()
            response = await client.post(
                f"{base_url}/api/v1/greenhouses",
                json=create_body,
                headers=headers,
            )
            response.raise_for_status()
            latencies.append((time.perf_counter() - start) * 1000)
    return latencies


def report(name: str, latencies: list[float]) -> None:
    print(f"\n{name} ({len(latencies)} requests)")
    print(f"  min:  {min(latencies):.2f} ms")
    print(f"  mean: {statistics.mean(latencies):.2f} ms")
    print(f"  p50:  {percentile(latencies, 50):.2f} ms")
    print(f"  p95:  {percentile(latencies, 95):.2f} ms")
    print(f"  p99:  {percentile(latencies, 99):.2f} ms")
    print(f"  max:  {max(latencies):.2f} ms")
    target = 50.0 if "WebSocket" in name else 200.0
    passed = percentile(latencies, 95) < target
    print(f"  p95 target ({target} ms): {'PASS' if passed else 'FAIL'}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="GreenhouseOS stress test")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--iterations", type=int, default=50)
    args = parser.parse_args()

    print(f"GreenhouseOS Stress Test — {args.iterations} iterations per endpoint")
    print(f"Target: {args.base_url}")

    rest = await stress_rest(args.base_url, args.iterations)
    report("REST /simulation/run", rest)

    ws = await stress_websocket(args.base_url, min(args.iterations, 30))
    report("WebSocket UPDATE_SIMULATION", ws)

    export = await stress_export(args.base_url, args.iterations)
    report("REST /export/climate-computer", export)

    crud = await stress_greenhouse_crud(args.base_url, min(args.iterations, 20))
    report("REST /greenhouses CRUD", crud)

    print("\nStress test complete.")


if __name__ == "__main__":
    asyncio.run(main())
