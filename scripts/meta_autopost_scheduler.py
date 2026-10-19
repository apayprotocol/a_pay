#!/usr/bin/env python3
"""
Meta Auto-Posting & Scheduling Engine for A-Pay Protocol
Targets Facebook Page: "APAY Protocol" (ID: 1356833567513986)
Linked Instagram: @apayprotocol (ID: 17841448471399142)

Compliant with A-Pay Protocol Security & Zero Credential Leak Invariant.
Credentials loaded strictly from local untracked `.env.meta`.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

# Configuration paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env.meta")
QUEUE_PATH = os.path.join(BASE_DIR, "scripts", "posts_100_queue.json")
LEDGER_PATH = os.path.join(BASE_DIR, "scripts", "scheduled_posts_ledger.json")

# 10 Daily UTC Time Slots spaced across 24h for Global English Audiences
DAILY_UTC_SLOTS = [
    (0, 0),    # Slot 1: 00:00 UTC (US East 8 PM / Asia Morning)
    (2, 30),   # Slot 2: 02:30 UTC (US West 7:30 PM)
    (5, 0),    # Slot 3: 05:00 UTC (APAC Early Workday)
    (7, 30),   # Slot 4: 07:30 UTC (UK / Europe Morning 8:30 AM CET)
    (10, 0),   # Slot 5: 10:00 UTC (Europe Peak Work Hours)
    (12, 30),  # Slot 6: 12:30 UTC (US East Morning / EU Afternoon)
    (15, 0),   # Slot 7: 15:00 UTC (US East Peak 11:00 AM EST)
    (17, 30),  # Slot 8: 17:30 UTC (US Midday / Lunch Break)
    (20, 0),   # Slot 9: 20:00 UTC (US Afternoon / Evening)
    (22, 30),  # Slot 10: 22:30 UTC (US Prime Evening 6:30 PM PST)
]

def load_credentials():
    """Loads Meta credentials safely from .env.meta."""
    creds = {}
    if not os.path.exists(ENV_PATH):
        raise FileNotFoundError(f"Missing {ENV_PATH}. Please provide META_USER_TOKEN and META_PAGE_ID.")
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                creds[k.strip()] = v.strip()
    return creds

def get_page_access_token(user_token: str, page_id: str) -> str:
    """Exchanges User Access Token for Page Access Token via /me/accounts."""
    url = f"https://graph.facebook.com/v21.0/me/accounts?access_token={user_token}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for account in data.get("data", []):
                if str(account.get("id")) == str(page_id):
                    return account.get("access_token")
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"HTTPError fetching Page Token: {e.code} - {e.read().decode('utf-8')}\n")
        raise
    raise ValueError(f"Page ID {page_id} not found in user authorized accounts.")

def load_posts_queue():
    """Loads 100 pre-generated viral question posts."""
    if not os.path.exists(QUEUE_PATH):
        raise FileNotFoundError(f"Queue file {QUEUE_PATH} not found. Run scripts/build_100_viral_posts.py first.")
    with open(QUEUE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def load_ledger():
    """Loads scheduled posts ledger."""
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_ledger(ledger):
    """Saves scheduled posts ledger."""
    with open(LEDGER_PATH, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2, ensure_ascii=False)

def post_to_facebook(page_id: str, page_token: str, message: str, scheduled_time: int = None) -> dict:
    """Publishes or schedules a post to the Facebook Page feed."""
    url = f"https://graph.facebook.com/v21.0/{page_id}/feed"
    payload = {
        "message": message,
        "access_token": page_token
    }
    if scheduled_time is not None:
        payload["published"] = "false"
        payload["scheduled_publish_time"] = str(scheduled_time)

    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        sys.stderr.write(f"Facebook Graph API Error ({e.code}): {err_msg}\n")
        raise

def get_page_scheduled_posts(page_id: str, page_token: str) -> list:
    """Fetches currently scheduled posts for the page."""
    url = f"https://graph.facebook.com/v21.0/{page_id}/scheduled_posts?access_token={page_token}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("data", [])
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"Error fetching scheduled posts: {e.code} - {e.read().decode('utf-8')}\n")
        return []

def calculate_future_slots(count: int = 100, min_offset_minutes: int = 15):
    """
    Calculates `count` sequential future UTC datetimes following the DAILY_UTC_SLOTS.
    Ensures every slot is at least `min_offset_minutes` in the future.
    """
    now = datetime.now(timezone.utc)
    slots = []
    current_day = now.date()

    for d in range(count // 10 + 5):
        day_date = current_day + timedelta(days=d)
        for hour, minute in DAILY_UTC_SLOTS:
            slot_dt = datetime(day_date.year, day_date.month, day_date.day, hour, minute, tzinfo=timezone.utc)
            if (slot_dt - now).total_seconds() >= (min_offset_minutes * 60):
                slots.append(slot_dt)
                if len(slots) == count:
                    break
        if len(slots) == count:
            break

    return slots

# -------------------------------------------------------------
# CLI Commands
# -------------------------------------------------------------

def cmd_status():
    """Checks page connection, token tasks, and scheduled posts count."""
    creds = load_credentials()
    user_token = creds["META_USER_TOKEN"]
    page_id = creds["META_PAGE_ID"]
    
    print("==================================================")
    print("🚀 META CONNECTION & STATUS CHECK (A-PAY PROTOCOL)")
    print("==================================================")
    print(f"Target Page ID : {page_id}")
    
    page_token = get_page_access_token(user_token, page_id)
    print(f"Page Token     : Verified (Length: {len(page_token)})")
    
    # Check Page Info
    url = f"https://graph.facebook.com/v21.0/{page_id}?fields=id,name,link,fan_count&access_token={page_token}"
    with urllib.request.urlopen(url) as resp:
        page_info = json.loads(resp.read().decode("utf-8"))
        print(f"Page Name      : {page_info.get('name')}")
        print(f"Page Link      : {page_info.get('link')}")
        print(f"Followers/Fans : {page_info.get('fan_count')}")

    # Check Scheduled Posts
    sched = get_page_scheduled_posts(page_id, page_token)
    print(f"Scheduled Posts: {len(sched)} posts currently queued in Meta.")
    for idx, p in enumerate(sched[:5], 1):
        ts = p.get("scheduled_publish_time", 0)
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        print(f"  [{idx}] ID: {p.get('id')} | Time (UTC): {dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    if len(sched) > 5:
        print(f"  ... and {len(sched) - 5} more posts scheduled.")

    ledger = load_ledger()
    print(f"Local Ledger   : {len(ledger)} recorded scheduled posts.")

def cmd_preview(limit: int = 5):
    """Prints a preview of the question-based posts from queue."""
    posts = load_posts_queue()
    slots = calculate_future_slots(len(posts))
    
    print("==================================================")
    print(f"📋 PREVIEWING FIRST {limit} OUT OF {len(posts)} POSTS")
    print("==================================================")
    for i in range(min(limit, len(posts))):
        p = posts[i]
        slot_dt = slots[i]
        cta_word, cta_desc = p["cta"]
        full_msg = f"{p['hook']}\n\n{p['body']}\n\n---\n💬 Drop a comment with \"{cta_word}\" below, and {cta_desc}\n\n{p['hashtags']}"
        print(f"\n--- [POST {i+1}/100 | Slot Time: {slot_dt.strftime('%Y-%m-%d %H:%M UTC')} | CTA: {cta_word}] ---")
        print(full_msg)
        print("-" * 50)

def cmd_schedule_batch(count: int = 100):
    """
    Schedules `count` posts (up to 100) to Meta Graph API.
    Uses 10 daily slots across 10 days.
    """
    creds = load_credentials()
    user_token = creds["META_USER_TOKEN"]
    page_id = creds["META_PAGE_ID"]
    page_token = get_page_access_token(user_token, page_id)

    posts = load_posts_queue()
    slots = calculate_future_slots(count)
    ledger = load_ledger()
    scheduled_hooks = {item.get("hook") for item in ledger}

    to_schedule = []
    for idx, p in enumerate(posts[:count]):
        if p["hook"] in scheduled_hooks:
            continue
        to_schedule.append((idx, p, slots[idx]))

    print("==================================================")
    print(f"📅 SCHEDULING {len(to_schedule)} POSTS ACROSS 10 DAYS")
    print(f"Target Page ID : {page_id}")
    if to_schedule:
        print(f"First Slot     : {to_schedule[0][2].strftime('%Y-%m-%d %H:%M UTC')}")
        print(f"Last Slot      : {to_schedule[-1][2].strftime('%Y-%m-%d %H:%M UTC')}")
    print("==================================================")

    success_count = 0
    for num, (orig_idx, post_item, slot_dt) in enumerate(to_schedule, 1):
        scheduled_ts = int(slot_dt.timestamp())
        cta_word, cta_desc = post_item["cta"]
        full_message = f"{post_item['hook']}\n\n{post_item['body']}\n\n---\n💬 Drop a comment with \"{cta_word}\" below, and {cta_desc}\n\n{post_item['hashtags']}"

        print(f"[{num}/{len(to_schedule)}] Post #{orig_idx+1} ➔ {slot_dt.strftime('%Y-%m-%d %H:%M UTC')} ({post_item['hook'][:45]}...)", end=" ", flush=True)
        try:
            res = post_to_facebook(page_id, page_token, full_message, scheduled_time=scheduled_ts)
            post_id = res.get("id")
            print(f"✅ OK ({post_id})")
            
            ledger.append({
                "index": orig_idx + 1,
                "post_id": post_id,
                "scheduled_time_utc": slot_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "timestamp": scheduled_ts,
                "hook": post_item["hook"],
                "cta": cta_word
            })
            save_ledger(ledger)
            success_count += 1
            time.sleep(2.0)  # Safe rate limit pause
        except Exception as e:
            print(f"❌ FAILED: {e}")
            time.sleep(5.0)

    print(f"\n🎉 Successfully scheduled {success_count}/{len(to_schedule)} posts to Facebook Page!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="A-Pay Protocol Meta Growth Scheduler")
    parser.add_argument("command", choices=["status", "preview", "schedule"], help="Command to run")
    parser.add_argument("--count", type=int, default=100, help="Number of posts to schedule (default: 100)")
    parser.add_argument("--limit", type=int, default=3, help="Number of posts to preview")

    args = parser.parse_args()

    if args.command == "status":
        cmd_status()
    elif args.command == "preview":
        cmd_preview(limit=args.limit)
    elif args.command == "schedule":
        cmd_schedule_batch(count=args.count)
