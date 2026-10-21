#!/usr/bin/env python3
"""
Dual-Platform Visual Posting Engine (Facebook Page + Instagram @apayprotocol)
Uploads high-resolution graphic to Facebook Page, then relays the Facebook CDN
URL to Instagram Graph API to publish simultaneously on both platforms.

Zero third-party image hosting required. 100% Meta native infrastructure.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env.meta")

def load_credentials():
    creds = {}
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                creds[k] = v
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

def upload_photo_to_facebook(page_id: str, page_token: str, image_path: str, caption: str) -> dict:
    """Uploads a local image file directly to the Facebook Page via multipart/form-data."""
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    body = bytearray()
    
    # 1. access_token field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="access_token"\r\n\r\n')
    body.extend(f"{page_token}\r\n".encode("utf-8"))

    # 2. caption field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="caption"\r\n\r\n')
    body.extend(f"{caption}\r\n".encode("utf-8"))

    # 3. source (file) field
    filename = os.path.basename(image_path)
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="source"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: image/png\r\n\r\n")
    body.extend(image_bytes)
    body.extend(b"\r\n")

    # Closing boundary
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    url = f"https://graph.facebook.com/v21.0/{page_id}/photos"
    req = urllib.request.Request(url, data=bytes(body), method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"Facebook Photo Upload Error ({e.code}): {e.read().decode('utf-8')}\n")
        raise

def get_facebook_cdn_url(photo_id: str, page_token: str) -> str:
    """Fetches high-resolution public CDN URL from Facebook Photo object."""
    url = f"https://graph.facebook.com/v21.0/{photo_id}?fields=images&access_token={page_token}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        images = data.get("images", [])
        if images:
            return images[0].get("source")
    raise ValueError(f"Could not retrieve public image URL for photo {photo_id}")

def publish_to_instagram(ig_id: str, page_token: str, image_url: str, caption: str) -> dict:
    """Creates media container on Instagram and publishes it."""
    # Step 1: Create Container
    container_url = f"https://graph.facebook.com/v21.0/{ig_id}/media"
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": page_token
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(container_url, data=data, method="POST")
    
    with urllib.request.urlopen(req) as resp:
        container_res = json.loads(resp.read().decode("utf-8"))
        creation_id = container_res.get("id")

    print(f"  • IG Container Created: {creation_id}. Waiting 4s for Meta transcoding...")
    time.sleep(4.0)

    # Step 2: Publish Container
    publish_url = f"https://graph.facebook.com/v21.0/{ig_id}/media_publish"
    pub_payload = {
        "creation_id": creation_id,
        "access_token": page_token
    }
    pub_data = urllib.parse.urlencode(pub_payload).encode("utf-8")
    pub_req = urllib.request.Request(publish_url, data=pub_data, method="POST")

    with urllib.request.urlopen(pub_req) as pub_resp:
        return json.loads(pub_resp.read().decode("utf-8"))

def post_dual(image_path: str, caption: str):
    creds = load_credentials()
    user_token = creds["META_USER_TOKEN"]
    page_id = creds["META_PAGE_ID"]
    ig_id = creds["META_IG_USER_ID"]

    print("==================================================")
    print("🚀 DUAL-PLATFORM AUTO-POSTING (FB + INSTAGRAM)")
    print("==================================================")
    print(f"Target Facebook Page : {page_id}")
    print(f"Target Instagram ID  : {ig_id} (@apayprotocol)")
    print(f"Image File           : {image_path}")

    # Step 1: Get Page Token
    page_token = get_page_access_token(user_token, page_id)
    print(f"Page Access Token    : Verified")

    # Step 2: Post Photo to Facebook Page
    print("\n[Step 1/3] Uploading Photo to Facebook Page Feed...")
    fb_res = upload_photo_to_facebook(page_id, page_token, image_path, caption)
    photo_id = fb_res.get("id")
    post_id = fb_res.get("post_id")
    print(f"✅ Facebook Photo Published! Photo ID: {photo_id} (Post ID: {post_id})")

    # Step 3: Get Facebook CDN URL
    print("\n[Step 2/3] Extracting High-Res Facebook CDN URL...")
    cdn_url = get_facebook_cdn_url(photo_id, page_token)
    print(f"✅ Facebook CDN URL obtained: {cdn_url[:60]}...")

    # Step 4: Publish to Instagram
    print("\n[Step 3/3] Relaying to Instagram (@apayprotocol)...")
    ig_res = publish_to_instagram(ig_id, page_token, cdn_url, caption)
    ig_media_id = ig_res.get("id")
    print(f"✅ Instagram Post Published! Media ID: {ig_media_id}")

    print("\n🎉 DUAL POST SUCCESS! Content is live on BOTH Facebook Page and Instagram!")
    return {
        "facebook_post_id": post_id,
        "facebook_photo_id": photo_id,
        "instagram_media_id": ig_media_id,
        "cdn_url": cdn_url
    }

if __name__ == "__main__":
    test_caption = """AI doesn't need your water. It needs your DATA.

In 2026 and beyond, gold is just metal. High-quality, verified human data is the world's most valuable asset.

Right now, multi-billion dollar AI companies are aggressively crawling your WordPress blog, news portal, and technical guides.
• They scrape your best research for free.
• They train commercial LLMs on your expertise without paying a single cent.
• They consume your server bandwidth, driving up your hosting bills.
• And 42% of your human visitors block display ads anyway!

Why are you giving away the new gold for free?

With the "A-Pay Web3 AI Paywall" WordPress plugin:
1. HTTP 402 challenges AI bots: They either pay on-chain micro-settlements on Base L2 or get stopped cold at the firewall.
2. Genuine human readers unlock articles in 1 tap for $0.05 without email or credit card forms.
3. Server bandwidth drain is cut in half, slashing hosting costs.
4. You keep 99.5% of your earnings with 2-second settlement into your self-custody wallet.

Stop letting scrapers drain your server for free while ad revenue collapses.

You can activate this in 60 seconds:
Open your WordPress dashboard, navigate to Plugins > Add New, and search for "A-Pay Web3 AI Paywall".

---
💬 Drop a comment with "DATA" below, and I'll send you the 1-click WordPress plugin setup guide & live interactive demo!

#WordPress #DataIsTheNewGold #WebScraping #AIPaywall #ContentMonetization #Web3 #BaseChain #APayProtocol #BloggingTips"""

    test_image = os.path.join(BASE_DIR, "scripts/assets/generated_graphics/ai_needs_data_not_water.png")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--execute":
        post_dual(test_image, test_caption)
    else:
        print("Dry run complete. Run with --execute to publish live to FB and IG.")
