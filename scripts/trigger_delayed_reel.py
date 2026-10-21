#!/usr/bin/env python3
"""
Delayed Reel Dispatcher for A-Pay Protocol
Sleeps for a specified duration (default: 600s = 10 mins), then automatically publishes
Reel #01 to Instagram Reels and LinkedIn!
"""

import os
import sys
import time
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(BASE_DIR, "scripts"))

from dispatch_reel_multiplatform import dispatch_reel

def main():
    delay_sec = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 600
    reel_idx = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 1
    
    queue_path = os.path.join(BASE_DIR, "scripts/reels_50_queue.json")
    with open(queue_path, "r", encoding="utf-8") as f:
        queue = json.load(f)

    target_reel = queue[reel_idx - 1]

    print(f"⏳ Armed 10-minute delayed dispatcher for Reel #{reel_idx}!")
    print(f"⏰ Sleeping for {delay_sec} seconds ({delay_sec / 60:.1f} minutes)...")
    print(f"🎯 Target platforms: Instagram Reels (@apayprotocol) + LinkedIn")
    
    start_time = time.time()
    while time.time() - start_time < delay_sec:
        remaining = int(delay_sec - (time.time() - start_time))
        if remaining % 60 == 0 or remaining <= 10:
            print(f"   ⏳ {remaining // 60}m {remaining % 60}s remaining until auto-dispatch...")
        time.sleep(min(30, max(1, remaining)))

    print("\n⏰ 10 MINUTES UP! Triggering auto-dispatch now...")
    dispatch_reel(target_reel, platforms=["instagram", "linkedin"])
    print("\n🎉 Delayed dispatch completed successfully!")

if __name__ == "__main__":
    main()
