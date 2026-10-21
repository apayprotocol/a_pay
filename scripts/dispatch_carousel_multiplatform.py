#!/usr/bin/env python3
"""
A-Pay Protocol — Multi-Platform Carousel Dispatcher
Publishes high-converting 7-slide image carousels across:
1. Instagram (@apayprotocol) via Graph API Carousel Container
2. Facebook Page via Multi-Photo Attached Media Album Post
3. LinkedIn via Company Page Publisher
4. Telegram Announcements Channel (@apay_protocol) via sendMediaGroup Album

Zero third-party dependencies. 100% native Meta, LinkedIn & Telegram APIs.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_META_PATH = os.path.join(BASE_DIR, ".env.meta")
LEDGER_PATH = os.path.join(BASE_DIR, "scripts/scheduled_carousels_ledger.json")

def load_meta_credentials():
    creds = {}
    if os.path.exists(ENV_META_PATH):
        with open(ENV_META_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    creds[k] = v
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

def upload_photo_to_facebook_unpublished(page_id: str, page_token: str, image_path: str) -> dict:
    """Uploads photo with published=false to obtain a Facebook media ID and CDN URL."""
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    body = bytearray()
    fields = {
        "access_token": page_token,
        "published": "false"
    }

    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{v}\r\n".encode("utf-8"))

    filename = os.path.basename(image_path)
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="source"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: image/png\r\n\r\n")
    body.extend(image_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    url = f"https://graph.facebook.com/v21.0/{page_id}/photos"
    req = urllib.request.Request(url, data=bytes(body), method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_facebook_cdn_url(photo_id: str, page_token: str) -> str:
    """Retrieves high-resolution public CDN URL from Facebook Photo object."""
    url = f"https://graph.facebook.com/v21.0/{photo_id}?fields=images&access_token={page_token}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        images = data.get("images", [])
        if images:
            return images[0].get("source")
    raise ValueError(f"Could not retrieve public image URL for photo {photo_id}")

def create_instagram_carousel_item(ig_id: str, page_token: str, image_url: str) -> str:
    """Creates a single item container for an Instagram Carousel."""
    url = f"https://graph.facebook.com/v21.0/{ig_id}/media"
    payload = {
        "image_url": image_url,
        "is_carousel_item": "true",
        "access_token": page_token
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("id")

def publish_instagram_carousel(ig_id: str, page_token: str, item_ids: list, caption: str) -> dict:
    """Creates the parent CAROUSEL container and publishes it to Instagram feed."""
    # Step 1: Create Carousel container
    container_url = f"https://graph.facebook.com/v21.0/{ig_id}/media"
    payload = {
        "media_type": "CAROUSEL",
        "children": ",".join(item_ids),
        "caption": caption,
        "access_token": page_token
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(container_url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        carousel_container_id = res.get("id")

    print(f"   • Instagram Carousel Container Created: {carousel_container_id}. Waiting 5s for Meta transcoding...")
    time.sleep(5.0)

    # Step 2: Publish Carousel
    publish_url = f"https://graph.facebook.com/v21.0/{ig_id}/media_publish"
    pub_payload = {
        "creation_id": carousel_container_id,
        "access_token": page_token
    }
    pub_data = urllib.parse.urlencode(pub_payload).encode("utf-8")
    pub_req = urllib.request.Request(publish_url, data=pub_data, method="POST")
    with urllib.request.urlopen(pub_req, timeout=30) as pub_resp:
        return json.loads(pub_resp.read().decode("utf-8"))

def publish_facebook_multi_photo_post(page_id: str, page_token: str, photo_ids: list, caption: str) -> dict:
    """Creates a multi-photo album post on the Facebook Page feed."""
    url = f"https://graph.facebook.com/v21.0/{page_id}/feed"
    payload = {
        "message": caption,
        "access_token": page_token
    }
    for i, pid in enumerate(photo_ids):
        payload[f"attached_media[{i}]"] = json.dumps({"media_fbid": str(pid)})

    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def publish_to_linkedin(lead_image_path: str, caption: str) -> dict:
    """Dispatches carousel announcement to LinkedIn Company Page."""
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
        if os.path.exists(lead_image_path):
            try:
                media_urn = upload_image(token, author_urn, lead_image_path)
            except Exception as e:
                print(f"⚠️ Image upload warning for {author_urn}: {e}")

        res = publish_post(token, author_urn, caption, media_urn=media_urn, title="A-Pay Protocol Update")

        # Fallback to personal profile if org fails (e.g. 403 or unpermitted org scope)
        if not res.get("success") and "urn:li:organization:" in str(author_urn) and user_id:
            member_urn = f"urn:li:person:{user_id}"
            print(f"🔄 Retrying LinkedIn post with Personal Member profile: {member_urn}...")
            media_urn = None
            if os.path.exists(lead_image_path):
                try:
                    media_urn = upload_image(token, member_urn, lead_image_path)
                except Exception:
                    pass
            res = publish_post(token, member_urn, caption, media_urn=media_urn, title="A-Pay Protocol Update")

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

def dispatch_carousel(carousel_item: dict, platforms: list = None) -> dict:
    if platforms is None:
        platforms = ["facebook", "instagram", "linkedin", "telegram"]

    results = {}
    creds = load_meta_credentials()
    user_token = creds.get("META_USER_TOKEN")
    page_id = creds.get("META_PAGE_ID")
    ig_id = creds.get("META_IG_USER_ID")

    slides = carousel_item.get("slides", [])
    caption = carousel_item.get("caption", "")
    idx = carousel_item.get("index", 5)

    print("\n" + "="*70)
    print(f"🚀 DISPATCHING CAROUSEL #{idx}: {carousel_item.get('title', 'A-Pay Protocol')}")
    print("="*70)
    print(f"Total Slides: {len(slides)}")

    if not slides:
        print("❌ No slides found for carousel.")
        return results

    page_token = None
    if ("facebook" in platforms or "instagram" in platforms) and user_token and page_id:
        page_token = get_page_access_token(user_token, page_id)

    photo_ids = []
    cdn_urls = []
    ig_item_ids = []

    # 1. Process Slides through Meta Cloud Infrastructure
    if page_token:
        print("\n📤 Uploading slides to Meta Cloud & preparing Instagram containers...")
        for i, slide_path in enumerate(slides):
            if not os.path.exists(slide_path):
                print(f"⚠️ Slide not found: {slide_path}")
                continue
            
            print(f"   [{i+1}/{len(slides)}] Processing: {os.path.basename(slide_path)}")
            fb_res = upload_photo_to_facebook_unpublished(page_id, page_token, slide_path)
            photo_id = fb_res.get("id")
            photo_ids.append(photo_id)

            cdn_url = get_facebook_cdn_url(photo_id, page_token)
            cdn_urls.append(cdn_url)

            if "instagram" in platforms and ig_id:
                ig_item_id = create_instagram_carousel_item(ig_id, page_token, cdn_url)
                ig_item_ids.append(ig_item_id)
                time.sleep(1.0)

    # 2. Publish to Instagram Carousel
    if "instagram" in platforms and ig_id and page_token and ig_item_ids:
        print("\n📸 Publishing to Instagram Carousel (@apayprotocol)...")
        try:
            ig_res = publish_instagram_carousel(ig_id, page_token, ig_item_ids, caption)
            published_media_id = ig_res.get("id")
            perm_url = f"https://graph.facebook.com/v21.0/{published_media_id}?fields=permalink&access_token={page_token}"
            with urllib.request.urlopen(perm_url) as perm_resp:
                perm_data = json.loads(perm_resp.read().decode("utf-8"))
                ig_url = perm_data.get("permalink", f"https://www.instagram.com/p/{published_media_id}/")

            print(f"✅ INSTAGRAM CAROUSEL LIVE: {ig_url}")
            results["instagram"] = {"success": True, "media_id": published_media_id, "url": ig_url}
        except Exception as e:
            print(f"❌ Instagram Carousel Failed: {e}")
            results["instagram"] = {"success": False, "error": str(e)}

    # 3. Publish to Facebook Page Multi-Photo Post
    if "facebook" in platforms and page_id and page_token and photo_ids:
        print("\n📘 Publishing Multi-Photo Album Post to Facebook Page...")
        try:
            fb_post_res = publish_facebook_multi_photo_post(page_id, page_token, photo_ids, caption)
            post_id = fb_post_res.get("id")
            fb_url = f"https://www.facebook.com/{post_id}"
            print(f"✅ FACEBOOK CAROUSEL LIVE: {fb_url}")
            results["facebook"] = {"success": True, "post_id": post_id, "url": fb_url}
        except Exception as e:
            print(f"❌ Facebook Post Failed: {e}")
            results["facebook"] = {"success": False, "error": str(e)}

    # 4. Publish to LinkedIn Company Page
    if "linkedin" in platforms:
        print("\n💼 Publishing Carousel Announcement to LinkedIn Company Page...")
        lead_slide = slides[0] if slides else ""
        li_res = publish_to_linkedin(lead_slide, caption)
        results["linkedin"] = li_res
        if li_res.get("success"):
            print(f"✅ LINKEDIN POST LIVE: {li_res.get('url')}")
        else:
            print(f"⚠️ LinkedIn Notice: {li_res.get('error')}")

    # 5. Publish to Telegram Announcements Channel Album
    if "telegram" in platforms and slides:
        print("\n✈️ Publishing Carousel Album to Telegram Channel (@apay_protocol)...")
        try:
            from telegram_channel_publisher import publish_telegram_carousel
            tg_res = publish_telegram_carousel(slides, caption)
            results["telegram"] = tg_res
            print(f"✅ TELEGRAM ALBUM LIVE: {tg_res.get('url')}")
        except Exception as e:
            print(f"❌ Telegram Album Failed: {e}")
            results["telegram"] = {"success": False, "error": str(e)}

    # 6. Record to Ledger
    ledger = []
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                ledger = json.load(f)
        except Exception:
            ledger = []

    ledger_entry = {
        "carousel_index": idx,
        "title": carousel_item.get("title", ""),
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "total_slides": len(slides),
        "results": results
    }
    ledger.append(ledger_entry)

    with open(LEDGER_PATH, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2)

    print("\n" + "="*70)
    print(f"🎉 CAROUSEL #{idx} DISPATCH COMPLETE!")
    print("="*70 + "\n")
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            item = json.load(f)
        dispatch_carousel(item)
    else:
        print("Usage: dispatch_carousel_multiplatform.py <path_to_item_json>")
