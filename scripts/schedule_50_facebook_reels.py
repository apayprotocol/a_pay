#!/usr/bin/env python3
"""
A-Pay Protocol — 10-Day Facebook Reels Cloud Scheduler
Schedules all 50 unique video reels natively on Meta's cloud servers:
- Reel #1: Scheduled to publish in 11 minutes (to verify live publishing)
- Reels #2-50: 5 daily slots across 10 days (spaced by ~4 hours)
- 100% Native Meta Cloud Scheduling: Publishes automatically even if your PC is OFF!
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env.meta")
QUEUE_PATH = os.path.join(BASE_DIR, "scripts/reels_50_queue.json")
LEDGER_PATH = os.path.join(BASE_DIR, "scripts/facebook_scheduled_reels_ledger.json")

def load_credentials():
    creds = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    creds[k.strip()] = v.strip().strip('"').strip("'")
    for k in ["META_USER_TOKEN", "META_PAGE_ID", "META_IG_USER_ID"]:
        if os.environ.get(k):
            creds[k] = os.environ[k].strip().strip('"').strip("'")
    return creds

def get_page_access_token(user_token: str, page_id: str) -> str:
    url = f"https://graph.facebook.com/v21.0/me/accounts?access_token={user_token}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        for account in data.get("data", []):
            if str(account.get("id")) == str(page_id):
                return account.get("access_token")
    raise ValueError(f"Page ID {page_id} not found in user accounts.")

def schedule_video_reel(page_id: str, page_token: str, video_path: str, caption: str, scheduled_timestamp: int) -> dict:
    """Uploads video to Meta with published=false and scheduled_publish_time."""
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    
    with open(video_path, "rb") as f:
        video_bytes = f.read()

    body = bytearray()
    fields = {
        "access_token": page_token,
        "title": caption.split("\n")[0][:80],
        "description": caption,
        "published": "false",
        "scheduled_publish_time": str(int(scheduled_timestamp))
    }

    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{v}\r\n".encode("utf-8"))

    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    filename = os.path.basename(video_path)
    body.extend(f'Content-Disposition: form-data; name="source"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: video/mp4\r\n\r\n")
    body.extend(video_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    url = f"https://graph.facebook.com/v21.0/{page_id}/videos"
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res

def verify_video_status(video_id: str, token: str) -> dict:
    url = f"https://graph.facebook.com/v21.0/{video_id}?fields=id,status,scheduled_publish_time&access_token={token}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def generate_schedule_timestamps(total_count: int, first_delay_sec: int = 660):
    """
    Generates exact UTC timestamps for 50 reels:
    - Item 1: now + first_delay_sec (e.g. 11 mins)
    - Items 2-5: today spaced by ~3.5 hours
    - Items 6-50: next 9 days, 5 slots daily (03:00, 07:30, 11:30, 15:30, 19:30 UTC)
    """
    now = datetime.now(timezone.utc)
    timestamps = []

    # 1. First item (verification test)
    t1 = now + timedelta(seconds=first_delay_sec)
    timestamps.append(int(t1.timestamp()))

    # 2. Remaining slots for today (Day 1)
    slots_today = [
        datetime(now.year, now.month, now.day, 14, 0, tzinfo=timezone.utc),
        datetime(now.year, now.month, now.day, 17, 30, tzinfo=timezone.utc),
        datetime(now.year, now.month, now.day, 21, 0, tzinfo=timezone.utc),
        datetime(now.year, now.month, now.day, 23, 45, tzinfo=timezone.utc)
    ]
    for st in slots_today:
        if len(timestamps) < total_count and st.timestamp() > (t1.timestamp() + 3600):
            timestamps.append(int(st.timestamp()))

    # 3. Days 2 to 10 (5 slots daily: 03:00, 07:30, 11:30, 15:30, 19:30 UTC)
    daily_slot_hours = [(3, 0), (7, 30), (11, 30), (15, 30), (19, 30)]
    day_offset = 1
    while len(timestamps) < total_count:
        target_date = (now + timedelta(days=day_offset)).date()
        for h, m in daily_slot_hours:
            if len(timestamps) >= total_count:
                break
            st = datetime(target_date.year, target_date.month, target_date.day, h, m, tzinfo=timezone.utc)
            timestamps.append(int(st.timestamp()))
        day_offset += 1

    return timestamps

def main():
    creds = load_credentials()
    user_token = creds["META_USER_TOKEN"]
    page_id = creds["META_PAGE_ID"]

    print("🔑 Authenticating with Meta Graph API...")
    page_token = get_page_access_token(user_token, page_id)
    print("✅ Page Access Token retrieved successfully.")

    if not os.path.exists(QUEUE_PATH):
        print(f"❌ Error: {QUEUE_PATH} not found.")
        sys.exit(1)

    with open(QUEUE_PATH, "r", encoding="utf-8") as f:
        queue = json.load(f)

    limit = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else len(queue)
    reels_to_schedule = queue[:limit]

    print(f"\n📅 Generating schedule timestamps for {len(reels_to_schedule)} reels across 10 days...")
    timestamps = generate_schedule_timestamps(len(reels_to_schedule), first_delay_sec=660) # 11 mins for first

    # Display First 5 Slots
    print("\n⏰ Upcoming Slots (UTC / Local):")
    for i in range(min(5, len(timestamps))):
        dt_utc = datetime.fromtimestamp(timestamps[i], tz=timezone.utc)
        mins_away = (timestamps[i] - time.time()) / 60
        print(f" • Reel #{i+1:02d}: {dt_utc.strftime('%Y-%m-%d %H:%M:%S UTC')} (~{mins_away:.1f} mins away)")

    # Check existing ledger to skip already scheduled reels
    already_scheduled = {}
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                old_ledger = json.load(f)
                for item in old_ledger:
                    if item.get("status") == "SCHEDULED" and item.get("video_id"):
                        already_scheduled[item["index"]] = item
        except Exception:
            pass

    ledger = list(already_scheduled.values())
    print("\n" + "="*70)
    print(f"🚀 SCHEDULING REELS NATIVELY TO META CLOUD SERVERS (Total Queue: {len(reels_to_schedule)})")
    print("="*70)

    for i, item in enumerate(reels_to_schedule):
        idx = item["index"]
        if idx in already_scheduled:
            print(f"[{i+1}/{len(reels_to_schedule)}] Reel #{idx:02d} already scheduled (ID: {already_scheduled[idx]['video_id']}) - Skipping.")
            continue
        video_path = item["file"]
        ts = timestamps[i]
        dt_utc = datetime.fromtimestamp(ts, tz=timezone.utc)
        
        hook = item["hook"]
        body = item["body"]
        hashtags = item.get("hashtags", "#Web3 #AI #WordPress #Monetization #BaseL2")
        caption = f"{hook}\n\n{body}\n\n💬 Comment 'PAYWALL' for the 1-click WordPress plugin install guide & live demo.\n\n{hashtags}"

        print(f"\n[{i+1}/{len(reels_to_schedule)}] Scheduling Reel #{idx:02d} for {dt_utc.strftime('%b %d, %H:%M UTC')}...")
        try:
            res = schedule_video_reel(page_id, page_token, video_path, caption, ts)
            video_id = res.get("id")
            print(f"   ✅ Meta Video ID: {video_id} (Cloud Scheduled)")
            
            ledger.append({
                "index": idx,
                "video_id": video_id,
                "video_path": video_path,
                "scheduled_timestamp": ts,
                "scheduled_utc": dt_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "status": "SCHEDULED"
            })
            
            # If Reel #1, verify with Meta
            if i == 0:
                print("   🔍 Verifying Reel #1 status on Meta servers...")
                time.sleep(2)
                v_status = verify_video_status(video_id, page_token)
                print(f"   📋 Meta Status: {v_status.get('status', {}).get('video_status')} | Publishing Phase: {v_status.get('status', {}).get('publishing_phase')}")

        except Exception as e:
            print(f"   ❌ Failed to schedule Reel #{idx}: {e}")
            ledger.append({
                "index": idx,
                "error": str(e),
                "status": "FAILED"
            })

    # Save Ledger
    with open(LEDGER_PATH, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2)

    print("\n" + "="*70)
    print("🎉 NATIVE CLOUD SCHEDULING COMPLETE!")
    print(f"📁 Ledger saved to : {LEDGER_PATH}")
    print(f"⏰ Reel #01 will automatically publish at: {datetime.fromtimestamp(timestamps[0], tz=timezone.utc).strftime('%H:%M:%S UTC')}")
    print(f"💡 You can completely turn off your PC — Meta handles all 50 reels on its cloud servers!")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
