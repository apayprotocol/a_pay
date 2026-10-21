#!/usr/bin/env python3
"""
A-Pay Protocol — 6-Day Automated Carousels Scheduler Daemon
Manages 12 unique 7-slide carousels across 6 days (2 carousels per day):
- Interleaved with 5 Reels/day (2-hour buffer prevents cannibalization)
- Slot 1: 09:30 UTC (3:00 PM IST / Europe Morning / US Early)
- Slot 2: 17:30 UTC (11:00 PM IST / Silicon Valley Peak / US Afternoon)
- Dispatches across Instagram Carousel (@apayprotocol), Facebook Page, LinkedIn, and Telegram Announcements (@apay_protocol)
- Tracks dispatched items in scripts/scheduled_carousels_ledger.json
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(BASE_DIR, "scripts"))
QUEUE_PATH = os.path.join(BASE_DIR, "scripts/carousels_12_queue.json")
LEDGER_PATH = os.path.join(BASE_DIR, "scripts/scheduled_carousels_ledger.json")

# 2 Daily Carousel Slots (UTC)
CAROUSEL_SLOTS = [
    (9, 30),   # 09:30 UTC (3:00 PM IST / Europe Peak)
    (17, 30)   # 17:30 UTC (11:00 PM IST / Silicon Valley Peak)
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
    return set(item.get("carousel_index") for item in ledger if item.get("carousel_index"))

def get_next_pending():
    queue = load_queue()
    dispatched = get_dispatched_indices()
    for item in queue:
        if item.get("index") not in dispatched:
            return item
    return None

def build_carousel_item_payload(item: dict) -> dict:
    idx = item.get("index")
    folder = item.get("folder")
    post_dir = os.path.join(BASE_DIR, "social-studio/posts", folder)
    dist_dir = os.path.join(post_dir, "dist")
    
    slides = []
    slide_count = item.get("slides_count", 7)
    for i in range(1, slide_count + 1):
        slide_name = f"slide-{str(i).padStart(2, '0') if hasattr(str(i), 'padStart') else f'{i:02d}'}.png"
        slide_path = os.path.join(dist_dir, slide_name)
        if os.path.exists(slide_path):
            slides.append(slide_path)

    return {
        "index": idx,
        "title": item.get("title", ""),
        "folder": folder,
        "slides": slides,
        "caption": item.get("caption", ""),
        "topic": item.get("topic", "")
    }

def print_status():
    queue = load_queue()
    dispatched = get_dispatched_indices()
    ledger = load_ledger()
    print("\n" + "="*70)
    print("📊 A-PAY PROTOCOL CAROUSEL SCHEDULE STATUS (6-DAY / 12-POST QUEUE)")
    print("="*70)
    print(f"Total Queued: {len(queue)} | Published: {len(dispatched)} | Remaining: {len(queue) - len(dispatched)}")
    print(f"Platforms Active: Instagram Carousel, Facebook Album, LinkedIn, Telegram")
    print("-"*70)
    for item in queue:
        idx = item.get("index")
        status = "✅ PUBLISHED" if idx in dispatched else "⏳ QUEUED"
        slot = item.get("scheduled_slot_utc", "09:30")
        day = f"Day {item.get('day_offset', 0) + 1}"
        print(f"[{status}] #{idx:02d} ({day} @ {slot} UTC) — {item.get('title')[:45]}...")

    if ledger:
        print("\nRecent Published Carousels:")
        for item in ledger[-5:]:
            idx = item.get("carousel_index")
            dt = item.get("dispatched_at")
            fb = item.get("results", {}).get("facebook", {}).get("url", "N/A")
            ig = item.get("results", {}).get("instagram", {}).get("url", "N/A")
            li = item.get("results", {}).get("linkedin", {}).get("url", "N/A")
            tg = item.get("results", {}).get("telegram", {}).get("url", "N/A")
            print(f" • Carousel #{idx} [{dt}]:")
            print(f"    - FB: {fb}")
            print(f"    - IG: {ig}")
            print(f"    - LI: {li}")
            print(f"    - TG: {tg}")
    print("="*70 + "\n")

def dispatch_next():
    from dispatch_carousel_multiplatform import dispatch_carousel
    next_item = get_next_pending()
    if not next_item:
        print("🎉 All 12 carousels have been published! Queue complete.")
        return None

    payload = build_carousel_item_payload(next_item)
    if not payload["slides"]:
        print(f"⚠️ Warning: No rendered slides found in dist/ for #{next_item.get('index')} ({next_item.get('folder')}).")
        print(f"   Please run `node generator/render.mjs {next_item.get('folder')}` first.")
        return None

    return dispatch_carousel(payload)

def main():
    parser = argparse.ArgumentParser(description="A-Pay Protocol Carousels Scheduler Daemon")
    parser.add_argument("--status", action="store_true", help="Print queue and publication status")
    parser.add_argument("--dispatch-next", action="store_true", help="Immediately dispatch the next pending carousel")
    parser.add_argument("--daemon", action="store_true", help="Run background scheduler daemon loop")
    args = parser.parse_args()

    if args.status or len(sys.argv) == 1:
        print_status()
        return

    if args.dispatch_next:
        dispatch_next()
        return

    if args.daemon:
        print("\n🚀 Starting A-Pay Carousel Scheduler Daemon (Slot 1: 09:30 UTC | Slot 2: 17:30 UTC)...")
        while True:
            now = datetime.now(timezone.utc)
            current_time = (now.hour, now.minute)
            # Check slot match with 2-minute leeway
            for sh, sm in CAROUSEL_SLOTS:
                if now.hour == sh and 0 <= (now.minute - sm) < 3:
                    print(f"⏰ Active slot matched: {sh:02d}:{sm:02d} UTC! Checking pending carousel...")
                    dispatch_next()
                    time.sleep(180) # Sleep past slot window
            time.sleep(30)

if __name__ == "__main__":
    main()
