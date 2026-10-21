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
FB_LEDGER_PATH = os.path.join(BASE_DIR, "scripts/facebook_scheduled_reels_ledger.json")

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

def get_next_pending_entry():
    queue = load_queue()
    dispatched = get_dispatched_indices()
    now_ts = int(time.time())

    # 1. Check if there is an undispatched reel whose scheduled timestamp is due
    if os.path.exists(FB_LEDGER_PATH):
        try:
            with open(FB_LEDGER_PATH, "r", encoding="utf-8") as f:
                fb_ledger = json.load(f)
            due_candidates = [
                e for e in fb_ledger
                if e.get("scheduled_timestamp") and e.get("scheduled_timestamp") <= (now_ts + 300) and e.get("index") not in dispatched
            ]
            if due_candidates:
                target_idx = due_candidates[0].get("index")
                for item in queue:
                    if item.get("index") == target_idx:
                        return item
        except Exception:
            pass

    # 2. Fallback to first undispatched item in queue
    for item in queue:
        if item.get("index") not in dispatched:
            return item
    return None

def get_fb_schedule_entry(reel_index: int):
    if os.path.exists(FB_LEDGER_PATH):
        try:
            with open(FB_LEDGER_PATH, "r", encoding="utf-8") as f:
                fb_ledger = json.load(f)
            for entry in fb_ledger:
                if entry.get("index") == reel_index:
                    return entry
        except Exception:
            pass
    return None

def dispatch_next():
    next_reel = get_next_pending_entry()
    if not next_reel:
        print("🎉 All 50 reels in queue have already been dispatched!")
        return False

    idx = next_reel.get("index")
    fb_entry = get_fb_schedule_entry(idx)

    # If already queued on Facebook Meta Cloud, only dispatch to IG, LinkedIn & Telegram
    platforms = ["instagram", "linkedin", "telegram"] if fb_entry else ["facebook", "instagram", "linkedin", "telegram"]

    from dispatch_reel_multiplatform import dispatch_reel
    print(f"🚀 Found pending reel #{idx}. Dispatching to: {', '.join(platforms)}...")
    dispatch_reel(next_reel, platforms=platforms)
    return True

def show_status():
    queue = load_queue()
    ledger = load_ledger()
    dispatched = get_dispatched_indices()
    next_reel = get_next_pending_entry()

    print("\n" + "="*70)
    print("📊 A-PAY PROTOCOL 10-DAY REELS SCHEDULE STATUS")
    print("="*70)
    print(f"Total Unique Reels in Queue : {len(queue)}")
    print(f"Total Dispatched to Date    : {len(dispatched)}")
    print(f"Remaining in Queue          : {len(queue) - len(dispatched)}")
    print(f"Posting Frequency           : 5 Reels / Day (Spaced ~4 Hours)")
    print(f"Platforms Active            : Facebook Reels, Instagram Reels, LinkedIn, Telegram")
    print("-"*70)

    if next_reel:
        idx = next_reel.get("index")
        fb_entry = get_fb_schedule_entry(idx)
        sched_time_str = fb_entry.get("scheduled_utc", "Next Daily Slot") if fb_entry else "Next Daily Slot"
        print(f"⏳ UPCOMING NEXT REEL: #{idx}")
        print(f"   • Hook          : {next_reel.get('hook')[:60]}...")
        print(f"   • Scheduled Time: {sched_time_str}")
        if fb_entry:
            ts = fb_entry.get("scheduled_timestamp", 0)
            now_ts = int(time.time())
            diff = ts - now_ts
            if diff > 0:
                print(f"   • Countdown     : {diff // 3600}h {(diff % 3600) // 60}m remaining")
            else:
                print(f"   • Status        : READY TO DISPATCH (Due now)")
        print(f"   • Target Rails  : Facebook (Meta Cloud) + Instagram + LinkedIn + Telegram")
    else:
        print("🎉 All reels in queue have been dispatched!")

    print("="*70)

    if ledger:
        print("\nRecent Dispatched Reels:")
        for item in ledger[-5:]:
            idx = item.get("reel_index")
            dt = item.get("dispatched_at")
            fb = item.get("results", {}).get("facebook", {}).get("url", "N/A (Meta Cloud)")
            ig = item.get("results", {}).get("instagram", {}).get("url", "N/A")
            li = item.get("results", {}).get("linkedin", {}).get("url", "N/A")
            tg = item.get("results", {}).get("telegram", {}).get("url", "N/A")
            print(f" • Reel #{idx} [{dt}]:")
            print(f"    - FB: {fb}")
            print(f"    - IG: {ig}")
            print(f"    - LI: {li}")
            print(f"    - TG: {tg}")
    print("\n" + "="*70 + "\n")

def run_daemon():
    print("🔄 Starting A-Pay Multi-Platform Reels Scheduler Daemon...")
    print("Synchronizing with Facebook Meta Cloud schedule & Daily Slots.")
    print("Checking status every 30 seconds. Press Ctrl+C to stop.\n")
    
    while True:
        try:
            next_reel = get_next_pending_entry()
            if not next_reel:
                print("🎉 All 50 reels in queue have been dispatched! Daemon exiting.")
                break

            idx = next_reel.get("index")
            fb_entry = get_fb_schedule_entry(idx)
            now_ts = int(time.time())

            if fb_entry and fb_entry.get("scheduled_timestamp"):
                sched_ts = fb_entry.get("scheduled_timestamp")
                if now_ts >= sched_ts:
                    print(f"\n⏰ [EXACT TIMESTAMP REACHED] Reel #{idx} is now DUE ({fb_entry.get('scheduled_utc')})!")
                    print(f"   Publishing simultaneously to Instagram, LinkedIn & Telegram...")
                    from dispatch_reel_multiplatform import dispatch_reel
                    dispatch_reel(next_reel, platforms=["instagram", "linkedin", "telegram"])
                    time.sleep(30)
                    continue
                else:
                    diff = sched_ts - now_ts
                    if diff % 300 < 30: # Log every 5 minutes
                        print(f"⏳ Reel #{idx} scheduled for {fb_entry.get('scheduled_utc')} ({diff // 3600}h {(diff % 3600) // 60}m remaining)...")
            else:
                # Fallback to standard DAILY_SLOTS
                now = datetime.now(timezone.utc)
                for h, m in DAILY_SLOTS:
                    if now.hour == h and abs(now.minute - m) <= 2:
                        print(f"\n⏰ Slot {h:02d}:{m:02d} UTC triggered for Reel #{idx}!")
                        dispatch_next()
                        time.sleep(180)
                        break

            time.sleep(30)
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
