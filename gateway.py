#!/usr/bin/env python3
"""
gateway.py — GateIoT Serial-to-Cloud Bridge
================================================
Reads card swipe JSON from the STM32F103C8T6 over USB serial,
POSTs it to the Vercel serverless API, and writes GRANT/DENY
back to the MCU.

Requirements:
    pip install pyserial requests

Usage:
    python gateway.py --port /dev/ttyUSB0 --url https://your-app.vercel.app
    (Windows: --port COM3)

    Set GATEIOT_URL env var to avoid passing --url every time.
"""

import json
import os
import sys
import time
import argparse
import serial
import requests

# ── Config ─────────────────────────────────────────────────────────────────
DEFAULT_BAUD  = 115200
API_TIMEOUT   = 8       # seconds to wait for Vercel response
SERIAL_TIMEOUT = 0.1    # non-blocking serial read timeout


def process_swipe(payload: dict, api_url: str) -> str:
    """POST payload to /api/swipe and return 'GRANT:<name>' or 'DENY:<reason>'."""
    try:
        resp = requests.post(
            f"{api_url}/api/swipe",
            json=payload,
            timeout=API_TIMEOUT,
        )
        data = resp.json()
        if data.get("granted"):
            name = data.get("name", "")
            return f"GRANT:{name}"
        else:
            reason = data.get("reason", "denied")
            return f"DENY:{reason}"
    except requests.exceptions.Timeout:
        print("[GATEWAY] API timeout", flush=True)
        return "DENY:timeout"
    except Exception as e:
        print(f"[GATEWAY] API error: {e}", flush=True)
        return "DENY:server_error"


def run(port: str, api_url: str, baud: int):
    api_url = api_url.rstrip("/")
    print(f"[GATEWAY] Connecting to {port} @ {baud} baud")
    print(f"[GATEWAY] API endpoint : {api_url}/api/swipe")

    with serial.Serial(port, baud, timeout=SERIAL_TIMEOUT) as ser:
        time.sleep(2)  # wait for STM32 reset after serial open
        ser.reset_input_buffer()
        print("[GATEWAY] Ready — waiting for card swipes...\n")

        while True:
            raw = ser.readline()
            if not raw:
                continue

            line = raw.decode("utf-8", errors="ignore").strip()
            if not line.startswith("{"):
                continue  # ignore non-JSON lines (debug prints etc.)

            print(f"[SWIPE]   {line}")

            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                print("[GATEWAY] Bad JSON, skipping")
                continue

            if "uid" not in payload:
                continue

            response = process_swipe(payload, api_url)
            print(f"[SEND]    {response}")

            ser.write((response + "\n").encode("utf-8"))
            ser.flush()


def main():
    parser = argparse.ArgumentParser(description="GateIoT serial gateway")
    parser.add_argument(
        "--port", default=os.environ.get("GATEIOT_PORT", os.environ.get("GATEKEEPER_PORT", "/dev/ttyUSB0")),
        help="Serial port (default: /dev/ttyUSB0, Windows: COM3)"
    )
    parser.add_argument(
        "--url", default=os.environ.get("GATEIOT_URL", os.environ.get("GATEKEEPER_URL", "")),
        help="Vercel deployment URL, e.g. https://gateiot.vercel.app"
    )
    parser.add_argument(
        "--baud", type=int, default=DEFAULT_BAUD,
        help=f"Baud rate (default: {DEFAULT_BAUD})"
    )
    args = parser.parse_args()

    if not args.url:
        print("ERROR: --url is required (or set GATEIOT_URL env var)")
        sys.exit(1)

    try:
        run(args.port, args.url, args.baud)
    except serial.SerialException as e:
        print(f"[GATEWAY] Serial error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n[GATEWAY] Stopped.")


if __name__ == "__main__":
    main()
