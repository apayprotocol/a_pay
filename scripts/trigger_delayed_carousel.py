#!/usr/bin/env python3
"""
Delayed Carousel Dispatcher for A-Pay Protocol
Waits for a specified countdown duration (default: 600s = 10 minutes),
then automatically publishes the new Carousel post across Facebook, Instagram, and LinkedIn.
"""

import os
import sys
import time
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(BASE_DIR, "scripts"))

from dispatch_carousel_multiplatform import dispatch_carousel

def main():
    delay_sec = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 600
    item_file = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE_DIR, "scripts/target_test_carousel.json")

    if not os.path.exists(item_file):
        print(f"❌ Error: Target carousel file not found at: {item_file}")
        sys.exit(1)

    with open(item_file, "r", encoding="utf-8") as f:
        target_item = json.load(f)

    idx = target_item.get("index", 5)
    title = target_item.get("title", "A-Pay Protocol")

    print("\n" + "="*70, flush=True)
    print(f"⏳ ARMED {delay_sec // 60}-MINUTE DELAYED CAROUSEL DISPATCHER", flush=True)
    print(f"🎯 Target Post: #{idx} — {title}", flush=True)
    print(f"⏰ Delay: {delay_sec} seconds ({delay_sec / 60:.1f} minutes)", flush=True)
    print(f"📱 Platforms: Instagram Carousel (@apayprotocol) + Facebook Page + LinkedIn + Telegram Channel (@apay_protocol)", flush=True)
    print("="*70 + "\n", flush=True)

    start_time = time.time()
    while time.time() - start_time < delay_sec:
        remaining = int(delay_sec - (time.time() - start_time))
        if remaining % 60 == 0 or remaining <= 10:
            print(f"   ⏳ {remaining // 60}m {remaining % 60}s remaining until live carousel dispatch...", flush=True)
        time.sleep(min(30, max(1, remaining)))

    print("\n⏰ 10 MINUTES UP! Triggering live multi-platform carousel dispatch now...", flush=True)
    dispatch_carousel(target_item)
    print("\n🎉 Live carousel dispatch test completed successfully!", flush=True)

if __name__ == "__main__":
    main()
