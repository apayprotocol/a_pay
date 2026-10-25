#!/usr/bin/env python3
"""
A-Pay Protocol — Multi-Platform Single Image Post Dispatcher
Publishes high-impact single-image technical news cards across:
1. Instagram Feed (@apayprotocol) via Meta Graph API single media container
2. Facebook Page Feed via Direct Photo Publish API
3. LinkedIn via Company Page / Member Publisher

Zero third-party dependencies. 100% native Meta & LinkedIn APIs.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(BASE_DIR, "scripts"))

ENV_META_PATH = os.path.join(BASE_DIR, ".env.meta")
LEDGER_PATH = os.path.join(BASE_DIR, "scripts/single_image_posts_ledger.json")

def load_meta_credentials():
    creds = {}
    if os.path.exists(ENV_META_PATH):
        with open(ENV_META_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    creds[k.strip()] = v.strip().strip('"').strip("'")
    for k in ["META_USER_TOKEN", "META_PAGE_ID", "META_IG_USER_ID"]:
        if os.environ.get(k):
            creds[k] = os.environ[k].strip().strip('"').strip("'")
    return creds

def get_page_access_token(user_token: str, page_id: str) -> str:
    url = f"https://graph.facebook.com/v21.0/me/accounts?access_token={user_token}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        for account in data.get("data", []):
            if str(account.get("id")) == str(page_id):
                return account.get("access_token")
    raise ValueError(f"Page ID {page_id} not found in user accounts.")

def upload_photo_to_facebook(page_id: str, page_token: str, image_path: str, caption: str, published: bool = True) -> dict:
    """Uploads photo binary directly to Facebook Page."""
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    body = bytearray()
    fields = {
        "access_token": page_token,
        "published": "true" if published else "false"
    }
    if caption and published:
        fields["caption"] = caption

    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{v}\r\n".encode("utf-8"))

    filename = os.path.basename(image_path)
    content_type = "image/png" if image_path.endswith(".png") else "image/jpeg"
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="source"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
    body.extend(image_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    url = f"https://graph.facebook.com/v21.0/{page_id}/photos"
    req = urllib.request.Request(url, data=bytes(body), method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_facebook_cdn_url(photo_id: str, page_token: str) -> str:
    """Retrieves public CDN image URL from Facebook Photo object."""
    url = f"https://graph.facebook.com/v21.0/{photo_id}?fields=images&access_token={page_token}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        images = data.get("images", [])
        if images:
            return images[0].get("source")
    raise ValueError(f"Could not retrieve public image URL for photo {photo_id}")

def publish_instagram_single_image(ig_id: str, page_token: str, image_url: str, caption: str) -> dict:
    """Creates single image container and publishes to Instagram feed."""
    # Step 1: Create Single Image Media Container
    container_url = f"https://graph.facebook.com/v21.0/{ig_id}/media"
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": page_token
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(container_url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        container_id = res.get("id")

    print(f"   • Instagram Single Image Container Created: {container_id}. Waiting 4s for Meta transcoding...")
    time.sleep(4.0)

    # Step 2: Publish Single Image
    publish_url = f"https://graph.facebook.com/v21.0/{ig_id}/media_publish"
    pub_payload = {
        "creation_id": container_id,
        "access_token": page_token
    }
    pub_data = urllib.parse.urlencode(pub_payload).encode("utf-8")
    pub_req = urllib.request.Request(publish_url, data=pub_data, method="POST")
    with urllib.request.urlopen(pub_req, timeout=30) as pub_resp:
        return json.loads(pub_resp.read().decode("utf-8"))

def publish_to_linkedin(image_path: str, caption: str, title: str = None) -> dict:
    """Publishes single image post to LinkedIn Company Page or Member Profile."""
    try:
        from linkedin_company_publisher import load_credentials as load_li_creds, get_authenticated_user, upload_image, publish_post
        creds = load_li_creds()
        token = creds.get("token")
        if not token:
            return {"success": False, "error": "No LinkedIn token configured"}

        user_info = get_authenticated_user(token)
        org_id = creds.get("org_id")
        user_id = user_info.get("sub") or user_info.get("id") if user_info else None
        author_urn = f"urn:li:organization:{org_id}" if org_id else (f"urn:li:person:{user_id}" if user_id else None)

        if not author_urn:
            return {"success": False, "error": "Could not determine LinkedIn author URN"}

        media_urn = None
        if os.path.exists(image_path):
            try:
                media_urn = upload_image(token, author_urn, image_path)
            except Exception as e:
                print(f"⚠️ Image upload warning for {author_urn}: {e}")

        res = publish_post(token, author_urn, caption, media_urn=media_urn, title=title or "A-Pay Protocol Tech Report")

        # Fallback to personal profile if organization post returns 403 Forbidden
        if not res.get("success") and "urn:li:organization:" in str(author_urn) and user_id:
            member_urn = f"urn:li:person:{user_id}"
            print(f"🔄 Retrying with Personal Profile: {member_urn}...")
            media_urn = None
            if os.path.exists(image_path):
                try:
                    media_urn = upload_image(token, member_urn, image_path)
                except Exception:
                    pass
            res = publish_post(token, member_urn, caption, media_urn=media_urn, title=title or "A-Pay Protocol Tech Report")

        if res.get("success"):
            return {
                "success": True,
                "post_urn": res.get("post_urn"),
                "url": res.get("permalink", f"https://www.linkedin.com/feed/update/{res.get('post_urn')}/")
            }
        else:
            return {
                "success": False,
                "status": res.get("status"),
                "error": res.get("error", "Unknown LinkedIn error")
            }
    except Exception as e:
        print(f"⚠️ LinkedIn dispatch warning: {e}")
        return {"success": False, "error": str(e)}

def dispatch_single_image(post_data: dict, platforms: list = None) -> dict:
    if platforms is None:
        platforms = ["facebook", "instagram", "linkedin"]

    results = {}
    creds = load_meta_credentials()
    user_token = creds.get("META_USER_TOKEN")
    page_id = creds.get("META_PAGE_ID")
    ig_id = creds.get("META_IG_USER_ID")

    image_path = post_data.get("image_path")
    if image_path and not os.path.isabs(image_path):
        image_path = os.path.join(BASE_DIR, image_path)

    caption = post_data.get("caption", "")
    title = post_data.get("title", "A-Pay Tech News")
    idx = post_data.get("index", 1)

    print("\n" + "="*70)
    print(f"🚀 DISPATCHING SINGLE IMAGE POST #{idx}: {title}")
    print("="*70)
    print(f"Image: {image_path}")

    if not image_path or not os.path.exists(image_path):
        print(f"❌ Error: Image file not found: {image_path}")
        return results

    page_token = None
    if ("facebook" in platforms or "instagram" in platforms) and user_token and page_id:
        page_token = get_page_access_token(user_token, page_id)

    # 1. Publish to Facebook Page Directly
    fb_photo_id = None
    cdn_url = None
    if page_token and page_id:
        print("\n📘 Publishing Native Image Post to Facebook Page...")
        try:
            fb_res = upload_photo_to_facebook(page_id, page_token, image_path, caption, published=True)
            fb_photo_id = fb_res.get("id")
            fb_post_id = fb_res.get("post_id") or fb_photo_id
            fb_url = f"https://www.facebook.com/{fb_post_id}"
            print(f"✅ FACEBOOK POST LIVE: {fb_url}")
            results["facebook"] = {"success": True, "post_id": fb_post_id, "photo_id": fb_photo_id, "url": fb_url}

            # Retrieve CDN URL for Instagram
            cdn_url = get_facebook_cdn_url(fb_photo_id, page_token)
        except Exception as e:
            print(f"❌ Facebook Publish Failed: {e}")
            results["facebook"] = {"success": False, "error": str(e)}

    # 2. Publish Single Image to Instagram Feed (@apayprotocol)
    if "instagram" in platforms and ig_id and page_token and cdn_url:
        print("\n📸 Publishing Native Single Image Post to Instagram (@apayprotocol)...")
        try:
            ig_res = publish_instagram_single_image(ig_id, page_token, cdn_url, caption)
            media_id = ig_res.get("id")
            perm_url = f"https://graph.facebook.com/v21.0/{media_id}?fields=permalink&access_token={page_token}"
            with urllib.request.urlopen(perm_url) as perm_resp:
                perm_data = json.loads(perm_resp.read().decode("utf-8"))
                ig_url = perm_data.get("permalink", f"https://www.instagram.com/p/{media_id}/")
            print(f"✅ INSTAGRAM POST LIVE: {ig_url}")
            results["instagram"] = {"success": True, "media_id": media_id, "url": ig_url}
        except Exception as e:
            print(f"❌ Instagram Single Post Failed: {e}")
            results["instagram"] = {"success": False, "error": str(e)}

    # 3. Publish to LinkedIn Company Page / Feed
    if "linkedin" in platforms:
        print("\n💼 Publishing Native Image Post to LinkedIn...")
        li_res = publish_to_linkedin(image_path, caption, title)
        results["linkedin"] = li_res
        if li_res.get("success"):
            print(f"✅ LINKEDIN POST LIVE: {li_res.get('url')}")
        else:
            print(f"⚠️ LinkedIn Notice: {li_res.get('error')}")

    # 4. Publish to Telegram Official Announcements Channel (@apay_protocol)
    try:
        from telegram_channel_publisher import publish_telegram_photo
        print("\n✈️ Publishing Native Image Post to Telegram Channel (@apay_protocol)...")
        tg_res = publish_telegram_photo(image_path, caption)
        results["telegram"] = tg_res
        if tg_res.get("success"):
            print(f"✅ TELEGRAM POST LIVE: {tg_res.get('url')}")
    except Exception as e:
        print(f"⚠️ Telegram Notice: {e}")
        results["telegram"] = {"success": False, "error": str(e)}

    # 5. Save to Ledger
    ledger = []
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                ledger = json.load(f)
        except Exception:
            ledger = []

    ledger_entry = {
        "index": idx,
        "title": title,
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "image_path": image_path,
        "results": results
    }
    ledger.append(ledger_entry)

    with open(LEDGER_PATH, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2)

    print("\n" + "="*70)
    print(f"🎉 SINGLE IMAGE POST #{idx} DISPATCH COMPLETE!")
    print("="*70 + "\n")
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            item = json.load(f)
        dispatch_single_image(item)
    else:
        print("Usage: dispatch_single_image_post.py <path_to_item_json>")
