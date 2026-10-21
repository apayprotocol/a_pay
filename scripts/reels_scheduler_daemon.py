#!/usr/bin/env python3
"""
A-Pay Protocol — 10-Day Automated Reels Scheduler Daemon
Manages 50 unique video reels across 10 days (5 reels per day):
- Spaced by 3.5 to 4 hours (Spam-safe, anti-shadowban)
- Automatically dispatches to Facebook Reels, Instagram Reels, and LinkedIn
- Tracks dispatched status in scripts/scheduled_reels_ledger.json
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(BASE_DIR, "scripts"))
QUEUE_PATH = os.path.join(BASE_DIR, "scripts/reels_50_queue.json")
LEDGER_PATH = os.path.join(BASE_DIR, "scripts/scheduled_reels_ledger.json")

# 5 Daily Slots (UTC)
DAILY_SLOTS = [
    (3, 0),    # 03:00 UTC (APAC Morning / US Night)
    (7, 30),   # 07:30 UTC (Europe Morning / Asia Afternoon)
    (11, 30),  # 11:30 UTC (Europe Midday / US East Morning)
    (15, 30),  # 15:30 UTC (US East Midday / Europe Evening)
    (19, 30)   # 19:30 UTC (US West Afternoon / US East Evening)
]

def load_queue():
    if not os.path.exists(QUEUE_PATH):
        return []
    with open(QUEUE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def load_ledger():
    if not os.path.exists(LEDGER_PATH):
        return []
    try:
        with open(LEDGER_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def get_dispatched_indices():
    ledger = load_ledger()
    return set(item.get("reel_index") for item in ledger if item.get("reel_index"))

def dispatch_next():
    queue = load_queue()
    if not queue:
        print("❌ Error: reels_50_queue.json is empty or not yet generated.")
        return False

    dispatched = get_dispatched_indices()
    for item in queue:
        idx = item.get("index")
        if idx not in dispatched:
            # Import dispatcher and send
            from dispatch_reel_multiplatform import dispatch_reel
            print(f"🚀 Found pending reel #{idx}. Dispatching now...")
            dispatch_reel(item)
            return True

    print("🎉 All 50 reels in queue have already been dispatched!")
    return False

def show_status():
    queue = load_queue()
    ledger = load_ledger()
    dispatched = get_dispatched_indices()

    print("\n" + "="*70)
    print("📊 A-PAY PROTOCOL 10-DAY REELS SCHEDULE STATUS")
    print("="*70)
    print(f"Total Unique Reels in Queue : {len(queue)}")
    print(f"Total Dispatched to Date    : {len(dispatched)}")
    print(f"Remaining in Queue          : {len(queue) - len(dispatched)}")
    print(f"Posting Frequency           : 5 Reels / Day (Spaced ~4 Hours)")
    print(f"Platforms Active            : Facebook Reels, Instagram Reels, LinkedIn")
    print("="*70)

    if ledger:
        print("\nRecent Dispatched Reels:")
        for item in ledger[-5:]:
            idx = item.get("reel_index")
            dt = item.get("dispatched_at")
            fb = item.get("results", {}).get("facebook", {}).get("url", "N/A")
            ig = item.get("results", {}).get("instagram", {}).get("url", "N/A")
            li = item.get("results", {}).get("linkedin", {}).get("url", "N/A")
            print(f" • Reel #{idx} [{dt}]:")
            print(f"    - FB: {fb}")
            print(f"    - IG: {ig}")
            print(f"    - LI: {li}")
    print("\n" + "="*70 + "\n")

def run_daemon():
    print("🔄 Starting A-Pay Multi-Platform Reels Scheduler Daemon...")
    print("Checking slots every 5 minutes. Press Ctrl+C to stop.")
    
    while True:
        try:
            now = datetime.now(timezone.utc)
            # Find closest slot
            for h, m in DAILY_SLOTS:
                if now.hour == h and abs(now.minute - m) <= 4:
                    print(f"⏰ Slot triggered at {now.strftime('%Y-%m-%d %H:%M:%S UTC')}!")
                    dispatch_next()
                    # Sleep 10 minutes to avoid re-triggering same slot
                    time.sleep(600)
                    break
            time.sleep(300)
        except KeyboardInterrupt:
            print("\nDaemon stopped by user.")
            break
        except Exception as e:
            print(f"⚠️ Daemon error: {e}")
            time.sleep(60)

def main():
    parser = argparse.ArgumentParser(description="A-Pay Protocol Reels Scheduler Daemon")
    parser.add_argument("--status", action="store_true", help="Show current queue and ledger status")
    parser.add_argument("--dispatch-next", action="store_true", help="Immediately dispatch the next pending reel")
    parser.add_argument("--daemon", action="store_true", help="Run background scheduler loop")

    args = parser.parse_args()

    if args.status:
        show_status()
    elif args.dispatch_next:
        dispatch_next()
    elif args.daemon:
        run_daemon()
    else:
        show_status()

if __name__ == "__main__":
    main()
