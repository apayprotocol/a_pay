#!/usr/bin/env python3
"""
A-Pay Protocol — 2-Day Single-Image Multi-Platform Scheduler Daemon
Schedules and automatically dispatches high-impact single-image technical news cards across:
1. Instagram Feed (@apayprotocol) via Meta Graph API
2. Facebook Page Feed via Direct Photo Upload API
3. LinkedIn via Company Page / Member Publisher
4. Telegram Official Announcements Channel (@apay_protocol)

Queue: scripts/single_image_posts_queue.json
Ledger: scripts/single_image_posts_ledger.json
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(BASE_DIR, "scripts"))

QUEUE_PATH = os.path.join(BASE_DIR, "scripts/single_image_posts_queue.json")
LEDGER_PATH = os.path.join(BASE_DIR, "scripts/single_image_posts_ledger.json")

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
    return set(item.get("index") for item in ledger if item.get("index") is not None)

def parse_iso(dt_str: str) -> datetime:
    """Parses ISO string into timezone-aware datetime in UTC."""
    if not dt_str:
        return datetime.min.replace(tzinfo=timezone.utc)
    clean = dt_str.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return datetime.min.replace(tzinfo=timezone.utc)

def format_time_delta(seconds: float) -> str:
    """Formats seconds into human readable countdown."""
    if seconds <= 0:
        return "NOW / OVERDUE"
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hrs > 0:
        return f"{hrs}h {mins}m"
    elif mins > 0:
        return f"{mins}m {secs}s"
    else:
        return f"{secs}s"

def print_status():
    queue = load_queue()
    dispatched = get_dispatched_indices()
    ledger = load_ledger()
    now = datetime.now(timezone.utc)

    print("\n" + "="*80)
    print("📊 A-PAY PROTOCOL — 2-DAY SINGLE-IMAGE POSTS SCHEDULER STATUS")
    print("="*80)
    print(f"Current UTC Time : {now.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"Total Queued     : {len(queue)} | Published: {len(dispatched)} | Remaining: {len(queue) - len(dispatched)}")
    print("Target Platforms : Instagram, Facebook, LinkedIn, Telegram")
    print("-"*80)

    for item in queue:
        idx = item.get("index")
        day = item.get("day", 1)
        title = item.get("title", "")
        sched_str = item.get("scheduled_at", "")
        sched_dt = parse_iso(sched_str)

        is_done = idx in dispatched
        status_badge = "✅ PUBLISHED " if is_done else "⏳ SCHEDULED "
        
        if is_done:
            countdown = "COMPLETED"
        else:
            diff = (sched_dt - now).total_seconds()
            countdown = f"in {format_time_delta(diff)}"

        print(f"[{status_badge}] #{idx:02d} [Day {day}] | {sched_dt.strftime('%H:%M UTC')} ({countdown:^12}) | {title[:40]}")

    if ledger:
        print("\n" + "-"*80)
        print("🔗 RECENTLY DISPATCHED POSTS & LIVE URLS:")
        for entry in ledger[-3:]:
            e_idx = entry.get("index")
            e_time = entry.get("dispatched_at", "N/A")
            res = entry.get("results", {})
            fb = res.get("facebook", {}).get("url", "N/A")
            ig = res.get("instagram", {}).get("url", "N/A")
            li = res.get("linkedin", {}).get("url", "N/A")
            tg = res.get("telegram", {}).get("url", "N/A")
            print(f" • Post #{e_idx} [{e_time}]:")
            print(f"    - FB : {fb}")
            print(f"    - IG : {ig}")
            print(f"    - LI : {li}")
            print(f"    - TG : {tg}")
    print("="*80 + "\n")

def dispatch_post_by_index(target_index: int):
    from dispatch_single_image_post import dispatch_single_image
    queue = load_queue()
    target_item = None
    for item in queue:
        if item.get("index") == target_index:
            target_item = item
            break

    if not target_item:
        print(f"❌ Error: Post index #{target_index} not found in queue.")
        return None

    return dispatch_single_image(target_item)

def check_and_dispatch_due():
    """Checks for any posts whose scheduled_at has arrived and have not been dispatched."""
    from dispatch_single_image_post import dispatch_single_image
    queue = load_queue()
    dispatched = get_dispatched_indices()
    now = datetime.now(timezone.utc)
    dispatched_list = []

    for item in queue:
        idx = item.get("index")
        if idx in dispatched:
            continue

        sched_dt = parse_iso(item.get("scheduled_at"))
        # If time has arrived
        if now >= sched_dt:
            print(f"\n⏰ [DUE] Post #{idx} scheduled for {sched_dt.strftime('%H:%M:%S UTC')} has matured (Now: {now.strftime('%H:%M:%S UTC')}).")
            print(f"🚀 Triggering automated multi-platform dispatch for #{idx} ({item.get('title')})...")
            try:
                res = dispatch_single_image(item)
                dispatched.add(idx)
                dispatched_list.append(idx)
                time.sleep(5)
            except Exception as e:
                print(f"❌ Error during auto-dispatch for #{idx}: {e}")

    if dispatched_list:
        return {"dispatched": True, "indices": dispatched_list}
    return {"dispatched": False, "indices": []}

def run_daemon():
    print("\n" + "="*80)
    print("🚀 A-PAY PROTOCOL SINGLE-IMAGE SCHEDULER DAEMON STARTED")
    print("="*80)
    print(f"Queue File  : {QUEUE_PATH}")
    print(f"Ledger File : {LEDGER_PATH}")
    print("Platforms   : Instagram, Facebook, LinkedIn, Telegram")
    print("Daemon Loop : Checking every 15 seconds for matured post slots...")
    print("="*80 + "\n")

    while True:
        try:
            res = check_and_dispatch_due()
            if res.get("dispatched"):
                print(f"✅ Successfully dispatched posts {res.get('indices')}! Resting 30s before next check...")
                time.sleep(30)
        except Exception as e:
            print(f"⚠️ Scheduler loop error: {e}")

        time.sleep(15)

def main():
    parser = argparse.ArgumentParser(description="A-Pay Protocol Single-Image Posts Scheduler Daemon")
    parser.add_argument("--status", action="store_true", help="Print schedule queue and ledger status")
    parser.add_argument("--daemon", action="store_true", help="Run automated background scheduler daemon loop")
    parser.add_argument("--dispatch-index", type=int, help="Manually dispatch specific post by index")
    parser.add_argument("--check-due", action="store_true", help="Check and dispatch any currently due post once")
    args = parser.parse_args()

    if args.status or len(sys.argv) == 1:
        print_status()
        return

    if args.dispatch_index is not None:
        dispatch_post_by_index(args.dispatch_index)
        return

    if args.check_due:
        res = check_and_dispatch_due()
        if not res.get("dispatched"):
            print("ℹ️ No posts are currently due for dispatch.")
        return

    if args.daemon:
        run_daemon()

if __name__ == "__main__":
    main()
