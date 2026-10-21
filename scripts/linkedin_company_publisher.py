#!/usr/bin/env python3
"""
A-Pay Protocol — Official LinkedIn Company Page Publisher
Automated posting engine for A-Pay Protocol's LinkedIn Company Page.
Uses the modern LinkedIn REST API (/rest/posts, /rest/images) with zero external dependencies (pure Python urllib).
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
ENV_PATH = os.path.join(BASE_DIR, ".env.linkedin")
API_VERSION = "202610"

def load_credentials():
    creds = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    creds[k.strip()] = v.strip().strip('"').strip("'")
    
    # Environment variables override .env
    token = os.environ.get("LINKEDIN_ACCESS_TOKEN", creds.get("LINKEDIN_ACCESS_TOKEN", ""))
    org_id = os.environ.get("LINKEDIN_ORGANIZATION_ID", creds.get("LINKEDIN_ORGANIZATION_ID", ""))
    return {"token": token, "org_id": org_id}

def make_request(url: str, method: str = "GET", headers: dict = None, data: bytes = None):
    req = urllib.request.Request(url, data=data, method=method)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_bytes = resp.read()
            resp_headers = dict(resp.headers)
            return resp.status, resp_headers, resp_bytes
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        return e.code, dict(e.headers), error_body.encode("utf-8")

def get_authenticated_user(token: str):
    """Fetch current user identity via OpenID userinfo or /v2/me."""
    url = "https://api.linkedin.com/v2/userinfo"
    headers = {"Authorization": f"Bearer {token}"}
    status, _, body = make_request(url, headers=headers)
    if status == 200:
        return json.loads(body.decode("utf-8"))
    
    # Fallback to /v2/me
    url = "https://api.linkedin.com/v2/me"
    status, _, body = make_request(url, headers=headers)
    if status == 200:
        return json.loads(body.decode("utf-8"))
    return None

def fetch_administered_organizations(token: str):
    """Fetch organizations where the user has administrative privileges."""
    url = "https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Restli-Protocol-Version": "2.0.0"
    }
    status, _, body = make_request(url, headers=headers)
    if status != 200:
        return []
    
    data = json.loads(body.decode("utf-8"))
    elements = data.get("elements", [])
    orgs = []
    for el in elements:
        entity = el.get("organizationalEntity", "")
        role = el.get("role", "")
        state = el.get("state", "")
        if "urn:li:organization:" in entity:
            org_id = entity.split("urn:li:organization:")[-1]
            orgs.append({"urn": entity, "org_id": org_id, "role": role, "state": state})
    return orgs

def upload_image(token: str, org_urn: str, image_path: str) -> str:
    """Uploads an image to LinkedIn and returns the image URN."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    # 1. Initialize Upload
    init_url = "https://api.linkedin.com/rest/images?action=initializeUpload"
    init_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": API_VERSION
    }
    init_payload = json.dumps({
        "initializeUploadRequest": {
            "owner": org_urn
        }
    }).encode("utf-8")

    status, _, body = make_request(init_url, method="POST", headers=init_headers, data=init_payload)
    if status not in (200, 201):
        raise RuntimeError(f"Failed to initialize image upload (HTTP {status}): {body.decode('utf-8', errors='replace')}")

    resp_data = json.loads(body.decode("utf-8")).get("value", {})
    upload_url = resp_data.get("uploadUrl")
    image_urn = resp_data.get("image")

    if not upload_url or not image_urn:
        raise RuntimeError(f"Malformed initialize upload response: {resp_data}")

    # 2. Upload binary bytes to pre-signed URL (Do NOT include main Bearer token)
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    ext = os.path.splitext(image_path)[1].lower()
    content_type = "image/png" if ext == ".png" else "image/jpeg"
    put_headers = {"Content-Type": content_type}

    status, _, body = make_request(upload_url, method="PUT", headers=put_headers, data=image_bytes)
    if status not in (200, 201):
        raise RuntimeError(f"Failed to upload image binary (HTTP {status}): {body.decode('utf-8', errors='replace')}")

    return image_urn

def upload_video(token: str, author_urn: str, video_path: str) -> str:
    """Uploads a video to LinkedIn DMS and waits for it to become AVAILABLE."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found at {video_path}")

    file_size = os.path.getsize(video_path)

    # 1. Initialize Video Upload
    init_url = "https://api.linkedin.com/rest/videos?action=initializeUpload"
    init_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": API_VERSION
    }
    init_payload = json.dumps({
        "initializeUploadRequest": {
            "owner": author_urn,
            "fileSizeBytes": file_size,
            "uploadCaptions": False,
            "uploadThumbnail": False
        }
    }).encode("utf-8")

    status, _, body = make_request(init_url, method="POST", headers=init_headers, data=init_payload)
    if status not in (200, 201):
        raise RuntimeError(f"Failed to initialize video upload (HTTP {status}): {body.decode('utf-8', errors='replace')}")

    resp_data = json.loads(body.decode("utf-8")).get("value", {})
    video_urn = resp_data.get("video")
    upload_token = resp_data.get("uploadToken", "")
    upload_instructions = resp_data.get("uploadInstructions", [])

    if not video_urn or not upload_instructions:
        raise RuntimeError(f"Malformed video initialize response: {resp_data}")

    # 2. Upload chunks
    uploaded_part_ids = []
    with open(video_path, "rb") as f:
        for idx, instruction in enumerate(upload_instructions):
            upload_url = instruction["uploadUrl"]
            first_byte = instruction["firstByte"]
            last_byte = instruction["lastByte"]
            chunk_length = (last_byte - first_byte) + 1

            f.seek(first_byte)
            chunk_data = f.read(chunk_length)

            put_headers = {"Content-Type": "application/octet-stream"}
            status, resp_headers, _ = make_request(upload_url, method="PUT", headers=put_headers, data=chunk_data)
            if status not in (200, 201):
                raise RuntimeError(f"Failed to upload video chunk {idx} (HTTP {status})")

            etag = resp_headers.get("etag") or resp_headers.get("ETag") or ""
            if etag:
                uploaded_part_ids.append(etag.strip('"'))

    # 3. Finalize Upload
    finalize_url = "https://api.linkedin.com/rest/videos?action=finalizeUpload"
    finalize_payload = json.dumps({
        "finalizeUploadRequest": {
            "video": video_urn,
            "uploadToken": upload_token,
            "uploadedPartIds": uploaded_part_ids
        }
    }).encode("utf-8")

    status, _, body = make_request(finalize_url, method="POST", headers=init_headers, data=finalize_payload)
    if status not in (200, 201):
        raise RuntimeError(f"Failed to finalize video upload (HTTP {status}): {body.decode('utf-8', errors='replace')}")

    print(f"🎬 Video binary uploaded (URN: {video_urn}). Waiting for LinkedIn transcoding...")

    # 4. Poll status until AVAILABLE
    video_id = urllib.parse.quote(video_urn)
    status_url = f"https://api.linkedin.com/rest/videos/{video_id}"
    status_headers = {
        "Authorization": f"Bearer {token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": API_VERSION
    }

    for attempt in range(24):
        time.sleep(5)
        status, _, body = make_request(status_url, method="GET", headers=status_headers)
        if status == 200:
            vdata = json.loads(body.decode("utf-8"))
            processing_status = vdata.get("status", "")
            print(f"   ⏳ Transcoding status: {processing_status} ({attempt + 1}/24)")
            if processing_status == "AVAILABLE":
                print("✅ Video is AVAILABLE and ready to publish!")
                return video_urn
            elif processing_status in ("CLIENT_ERROR", "PROCESSING_FAILED"):
                raise RuntimeError(f"LinkedIn video processing failed: {vdata}")

    return video_urn

def publish_post(token: str, author_urn: str, text: str, media_urn: str = None, title: str = None) -> dict:
    """Publishes a post (text, image, or video) to LinkedIn."""
    posts_url = "https://api.linkedin.com/rest/posts"
    post_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": API_VERSION
    }

    payload = {
        "author": author_urn,
        "commentary": text,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    if media_urn:
        if "urn:li:video:" in str(media_urn):
            payload["content"] = {
                "media": {
                    "id": media_urn,
                    "title": title or "A-Pay Web3 AI Paywall Reel"
                }
            }
        else:
            payload["content"] = {
                "media": {
                    "id": media_urn,
                    "altText": title or "A-Pay Protocol Web3 AI Paywall Infographic"
                }
            }

    status, headers, body = make_request(posts_url, method="POST", headers=post_headers, data=json.dumps(payload).encode("utf-8"))
    
    if status in (200, 201):
        post_urn = headers.get("x-restli-id", "")
        # Fallback to response body if header not present
        if not post_urn and body:
            try:
                post_urn = json.loads(body.decode("utf-8")).get("id", "")
            except Exception:
                pass
        
        # Format permalink
        permalink = f"https://www.linkedin.com/feed/update/{post_urn}/" if post_urn else "https://www.linkedin.com/company/a-pay-protocol/"
        return {
            "success": True,
            "post_urn": post_urn,
            "permalink": permalink,
            "status": status
        }
    else:
        err_msg = body.decode("utf-8", errors="replace")
        return {
            "success": False,
            "status": status,
            "error": err_msg
        }

def main():
    parser = argparse.ArgumentParser(description="A-Pay Protocol LinkedIn Publisher")
    parser.add_argument("--check", action="store_true", help="Verify credentials and discover identity")
    parser.add_argument("--text", type=str, help="Text commentary for the LinkedIn post")
    parser.add_argument("--image", type=str, help="Path to local image to attach to post")
    parser.add_argument("--video", type=str, help="Path to local video (MP4) to attach to post")
    parser.add_argument("--title", type=str, help="Title / Alt text for the media")
    parser.add_argument("--token", type=str, help="Override Access Token")
    parser.add_argument("--org-id", type=str, help="Override Numeric Organization ID")

    args = parser.parse_args()

    creds = load_credentials()
    token = args.token or creds.get("token")
    org_id = args.org_id or creds.get("org_id")

    if not token:
        print("❌ Error: LINKEDIN_ACCESS_TOKEN not found!")
        print(f"👉 Please provide it via argument `--token <token>` or save it in `{ENV_PATH}`")
        sys.exit(1)

    print("🔑 LinkedIn Access Token loaded.")

    # Check / Discovery mode
    if args.check:
        print("🔍 Checking LinkedIn identity...")
        user = get_authenticated_user(token)
        if user:
            name = user.get("name") or f"{user.get('localizedFirstName', '')} {user.get('localizedLastName', '')}".strip()
            print(f"✅ Authenticated as: {name} (Sub/ID: {user.get('sub') or user.get('id')})")
        orgs = fetch_administered_organizations(token)
        if orgs:
            print(f"✅ Found {len(orgs)} administered organization(s):")
            for o in orgs:
                print(f"   • URN: {o['urn']} (Org ID: {o['org_id']}) | Role: {o['role']} | State: {o['state']}")
        return

    # Determine Author URN (Organization or Personal Member)
    author_urn = None
    if org_id:
        author_urn = f"urn:li:organization:{org_id}"
        print(f"🏢 Configured Target: Company Page ({author_urn})")
    else:
        user = get_authenticated_user(token)
        user_id = user.get("sub") or user.get("id") if user else None
        
        orgs = fetch_administered_organizations(token)
        if orgs:
            org_id = orgs[0]["org_id"]
            author_urn = f"urn:li:organization:{org_id}"
            print(f"🏢 Auto-selected Company Page: {author_urn}")
        elif user_id:
            author_urn = f"urn:li:person:{user_id}"
            name = user.get("name") or "User"
            print(f"👤 Using Personal / Member Profile: {name} ({author_urn})")
        else:
            print("❌ Error: Could not determine User or Organization URN from token.")
            sys.exit(1)

    if not args.text and not args.image and not args.video:
        print("ℹ️ No post content provided. Use `--text`, `--image`, or `--video`.")
        return

    text = args.text or "A-Pay Protocol Web3 AI Paywall update."

    # Media upload
    media_urn = None
    if args.video:
        print(f"🎥 Uploading video reel: {args.video}...")
        media_urn = upload_video(token, author_urn, args.video)
        print(f"✅ Video ready for publishing! URN: {media_urn}")
    elif args.image:
        print(f"🖼️ Uploading graphic: {args.image}...")
        media_urn = upload_image(token, author_urn, args.image)
        print(f"✅ Image uploaded to LinkedIn DMS! URN: {media_urn}")

    print(f"🚀 Publishing post to LinkedIn ({author_urn})...")
    result = publish_post(token, author_urn, text=text, media_urn=media_urn, title=args.title)

    # Fallback to personal profile if organization post returns 403 Forbidden
    if not result.get("success") and "urn:li:organization:" in str(author_urn) and result.get("status") == 403:
        print("⚠️ Company Page post not permitted with current scope (403).")
        user = get_authenticated_user(token)
        user_id = user.get("sub") or user.get("id") if user else None
        if user_id:
            member_urn = f"urn:li:person:{user_id}"
            print(f"🔄 Retrying with Personal Profile: {member_urn}...")
            if args.video:
                media_urn = upload_video(token, member_urn, args.video)
            elif args.image:
                media_urn = upload_image(token, member_urn, args.image)
            result = publish_post(token, member_urn, text=text, media_urn=media_urn, title=args.title)
            author_urn = member_urn

    if result.get("success"):
        print("\n" + "="*60)
        target_name = "Company Page" if "organization" in author_urn else "Personal Feed"
        print(f"🎉 SUCCESS! Post is LIVE on LinkedIn ({target_name})!")
        print(f"🔗 Post URN   : {result['post_urn']}")
        print(f"🌐 Live URL   : {result['permalink']}")
        print("="*60 + "\n")
    else:
        print(f"\n❌ Failed to publish post (HTTP {result.get('status')}):")
        print(result.get("error"))
        sys.exit(1)

if __name__ == "__main__":
    main()
