#!/usr/bin/env python3
"""
A-Pay Protocol — Unified Multi-Platform Reel Dispatcher
Publishes a single vertical video reel (1080x1920 MP4) simultaneously across:
1. Facebook Page Reel (Meta Graph API)
2. Instagram Reel (@apayprotocol)
3. LinkedIn Feed (GST Neural / A-Pay Protocol)

Zero duplicate content. 100% native integration.
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
import urllib.error

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
META_ENV_PATH = os.path.join(BASE_DIR, ".env.meta")
LINKEDIN_ENV_PATH = os.path.join(BASE_DIR, ".env.linkedin")
LEDGER_PATH = os.path.join(BASE_DIR, "scripts/scheduled_reels_ledger.json")

def load_env(path):
    creds = {}
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    creds[k.strip()] = v.strip().strip('"').strip("'")
    return creds

def get_fb_page_token(user_token: str, page_id: str) -> str:
    url = f"https://graph.facebook.com/v21.0/me/accounts?access_token={user_token}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        for account in data.get("data", []):
            if str(account.get("id")) == str(page_id):
                return account.get("access_token")
    raise ValueError(f"Page ID {page_id} not found in user accounts.")

def upload_to_uguu(file_path: str) -> str:
    """Uploads video to Uguu to get a public direct URL with Byte-Range support for Instagram."""
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    filename = os.path.basename(file_path)
    body.extend(f'Content-Disposition: form-data; name="files[]"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: video/mp4\r\n\r\n")
    body.extend(file_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        "https://uguu.se/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        if res.get("success") and res.get("files"):
            return res["files"][0]["url"]
    raise RuntimeError(f"Uguu upload failed: {res}")

def publish_facebook_reel(page_id: str, page_token: str, video_path: str, caption: str) -> dict:
    """Uploads and publishes vertical video Reel directly to Facebook Page."""
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    with open(video_path, "rb") as f:
        video_bytes = f.read()

    body = bytearray()
    fields = {
        "access_token": page_token,
        "title": caption.split("\n")[0][:80],
        "description": caption
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
    with urllib.request.urlopen(req, timeout=90) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        video_id = res.get("id")
        return {
            "video_id": video_id,
            "url": f"https://www.facebook.com/reel/{video_id}/"
        }

def publish_instagram_reel(ig_id: str, page_token: str, public_video_url: str, caption: str) -> dict:
    """Creates and publishes Instagram Reel from public byte-range supported video URL."""
    # 1. Create Reel Container
    container_url = f"https://graph.facebook.com/v21.0/{ig_id}/media"
    payload = {
        "media_type": "REELS",
        "video_url": public_video_url,
        "caption": caption,
        "share_to_feed": "true",
        "access_token": page_token
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(container_url, data=data, method="POST")

    with urllib.request.urlopen(req, timeout=30) as resp:
        creation_id = json.loads(resp.read().decode("utf-8")).get("id")

    # 2. Poll Transcoding
    for _ in range(16):
        time.sleep(5)
        status_url = f"https://graph.facebook.com/v21.0/{creation_id}?fields=status_code&access_token={page_token}"
        with urllib.request.urlopen(urllib.request.Request(status_url)) as s_resp:
            status_code = json.loads(s_resp.read().decode("utf-8")).get("status_code")
            if status_code == "FINISHED":
                break
            elif status_code == "ERROR":
                raise RuntimeError(f"Instagram transcoding error for container {creation_id}")

    # 3. Media Publish
    publish_url = f"https://graph.facebook.com/v21.0/{ig_id}/media_publish"
    pub_payload = {"creation_id": creation_id, "access_token": page_token}
    pub_data = urllib.parse.urlencode(pub_payload).encode("utf-8")
    pub_req = urllib.request.Request(publish_url, data=pub_data, method="POST")

    with urllib.request.urlopen(pub_req, timeout=30) as pub_resp:
        media_id = json.loads(pub_resp.read().decode("utf-8")).get("id")
        return {
            "media_id": media_id,
            "url": f"https://www.instagram.com/reel/{media_id}/"
        }

def publish_linkedin_reel(video_path: str, caption: str) -> dict:
    """Dispatches reel to LinkedIn via linkedin_company_publisher.py."""
    pub_script = os.path.join(BASE_DIR, "scripts/linkedin_company_publisher.py")
    title = caption.split("\n")[0][:80]
    
    import subprocess
    cmd = [
        sys.executable, pub_script,
        "--video", video_path,
        "--title", title,
        "--text", caption
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        for line in res.stdout.split("\n"):
            if "Live URL" in line and "http" in line:
                url = line.split(":", 1)[1].strip()
                return {"success": True, "url": url}
        return {"success": True, "url": "https://www.linkedin.com/feed/"}
    else:
        raise RuntimeError(f"LinkedIn publish error: {res.stderr or res.stdout}")

def dispatch_reel(reel_entry: dict):
    video_path = reel_entry["file"]
    hook = reel_entry["hook"]
    body = reel_entry["body"]
    hashtags = reel_entry.get("hashtags", "")

    caption = f"{hook}\n\n{body}\n\n💬 Comment 'PAYWALL' for live demo & 1-click WordPress plugin install link.\n\n{hashtags}"

    print(f"\n=======================================================")
    print(f"🚀 DISPATCHING REEL #{reel_entry.get('index', 'X')}: {hook[:50]}...")
    print(f"📁 Video: {video_path}")
    print(f"=======================================================")

    meta_creds = load_env(META_ENV_PATH)
    page_id = meta_creds.get("META_PAGE_ID")
    ig_id = meta_creds.get("META_IG_USER_ID")
    user_token = meta_creds.get("META_USER_TOKEN")

    fb_token = get_fb_page_token(user_token, page_id)

    results = {}

    # 1. Facebook Reel
    try:
        print("📘 [1/3] Publishing Facebook Reel...")
        fb_res = publish_facebook_reel(page_id, fb_token, video_path, caption)
        print(f"   ✅ Facebook Reel LIVE: {fb_res['url']}")
        results["facebook"] = fb_res
    except Exception as e:
        print(f"   ❌ Facebook Reel failed: {e}")
        results["facebook"] = {"error": str(e)}

    # 2. Instagram Reel
    try:
        print("📸 [2/3] Uploading video to Edge host for Instagram...")
        edge_url = upload_to_uguu(video_path)
        print(f"   🔗 Edge Video URL: {edge_url}")
        print("   📸 Publishing Instagram Reel...")
        ig_res = publish_instagram_reel(ig_id, fb_token, edge_url, caption)
        print(f"   ✅ Instagram Reel LIVE: {ig_res['url']}")
        results["instagram"] = ig_res
    except Exception as e:
        print(f"   ❌ Instagram Reel failed: {e}")
        results["instagram"] = {"error": str(e)}

    # 3. LinkedIn Reel
    try:
        print("💼 [3/3] Publishing LinkedIn Reel...")
        li_res = publish_linkedin_reel(video_path, caption)
        print(f"   ✅ LinkedIn Reel LIVE: {li_res['url']}")
        results["linkedin"] = li_res
    except Exception as e:
        print(f"   ❌ LinkedIn Reel failed: {e}")
        results["linkedin"] = {"error": str(e)}

    # Append to Ledger
    ledger = []
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                ledger = json.load(f)
        except Exception:
            ledger = []

    ledger.append({
        "reel_index": reel_entry.get("index"),
        "hook": hook,
        "video": video_path,
        "dispatched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "results": results
    })

    with open(LEDGER_PATH, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2)

    print("\n🎉 Multi-platform dispatch complete! Logged in ledger.")
    return results

def main():
    parser = argparse.ArgumentParser(description="Multi-Platform Reel Dispatcher")
    parser.add_argument("--index", type=int, help="Reel index (1-50) from queue")
    parser.add_argument("--file", type=str, help="Direct video file path")
    parser.add_argument("--caption", type=str, help="Direct caption")

    args = parser.parse_args()

    if args.file and args.caption:
        reel_entry = {
            "index": 0,
            "file": args.file,
            "hook": args.caption.split("\n")[0],
            "body": args.caption,
            "hashtags": "#Web3 #AI #WordPress #Monetization"
        }
        dispatch_reel(reel_entry)
        return

    queue_path = os.path.join(BASE_DIR, "scripts/reels_50_queue.json")
    if not os.path.exists(queue_path):
        print("❌ Error: reels_50_queue.json not found! Run build_50_viral_reels.mjs first.")
        sys.exit(1)

    with open(queue_path, "r", encoding="utf-8") as f:
        queue = json.load(f)

    target_idx = args.index or 1
    if target_idx < 1 or target_idx > len(queue):
        print(f"❌ Index {target_idx} out of range (1 - {len(queue)})")
        sys.exit(1)

    reel_entry = queue[target_idx - 1]
    dispatch_reel(reel_entry)

if __name__ == "__main__":
    main()
