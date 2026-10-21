#!/usr/bin/env python3
"""
A-Pay Protocol — Official Telegram Announcements Channel Publisher
Dispatches video reels (MP4) and multi-slide carousels (photo albums) to
the official A-Pay Announcements Channel (@apay_protocol) via Telegram Bot API.

Features:
- Native MP4 video uploads via `sendVideo` (supports_streaming=True)
- Multi-photo carousel albums (up to 10 slides) via `sendMediaGroup`
- Safe caption trimming to Telegram 1024-character limit
- Dynamic credential resolution from web/.env.local or environment
- Zero external dependencies (standard Python urllib)
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_LOCAL_PATH = os.path.join(BASE_DIR, "web/.env.local")
ENV_PATH = os.path.join(BASE_DIR, ".env")

def load_telegram_credentials() -> tuple[str, str]:
    """Loads TELEGRAM_BOT_TOKEN and TELEGRAM_ANNOUNCEMENT_CHANNEL securely."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    channel = os.environ.get("TELEGRAM_ANNOUNCEMENT_CHANNEL", "@apay_protocol").strip()

    # Fallback to web/.env.local
    for env_file in [ENV_LOCAL_PATH, ENV_PATH]:
        if os.path.exists(env_file):
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("TELEGRAM_BOT_TOKEN=") and not token:
                        token = line.split("=", 1)[1].strip().strip('"').strip("'")
                    elif line.startswith("TELEGRAM_ANNOUNCEMENT_CHANNEL=") and channel == "@apay_protocol":
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            channel = val

    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not found in environment or web/.env.local")

    return token, channel

def make_multipart_body(fields: dict, files: list) -> tuple[bytes, str]:
    """
    Constructs a multipart/form-data body.
    fields: dict of {str: str}
    files: list of tuples (field_name, filename, mime_type, file_bytes)
    """
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    body = bytearray()

    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(v).encode("utf-8"))
        body.extend(b"\r\n")

    for field_name, filename, mime_type, file_bytes in files:
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
        body.extend(file_bytes)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return bytes(body), content_type

def format_caption(text: str, max_length: int = 1024, footer: str = "\n\n🔗 https://apayprotocol.org\n#APayProtocol #BaseChain #WordPress") -> str:
    """Formats and safe-truncates caption for Telegram limits while preserving link footer."""
    text = text.strip()
    if len(text) <= max_length:
        return text

    available_len = max_length - len(footer) - 4
    if available_len < 200:
        return text[:max_length]

    truncated = text[:available_len]
    last_nl = truncated.rfind("\n")
    if last_nl > available_len - 150:
        truncated = truncated[:last_nl]
    else:
        last_sp = truncated.rfind(" ")
        if last_sp > available_len - 100:
            truncated = truncated[:last_sp]

    return truncated.strip() + "..." + footer

def publish_telegram_video(video_path: str, caption: str, channel: str = None) -> dict:
    """
    Publishes an MP4 video reel to Telegram channel via sendVideo.
    """
    token, default_channel = load_telegram_credentials()
    target_channel = channel or default_channel

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    with open(video_path, "rb") as f:
        video_bytes = f.read()

    safe_caption = format_caption(caption)

    fields = {
        "chat_id": target_channel,
        "caption": safe_caption,
        "supports_streaming": "true"
    }
    files = [
        ("video", os.path.basename(video_path), "video/mp4", video_bytes)
    ]

    body, content_type = make_multipart_body(fields, files)

    url = f"https://api.telegram.org/bot{token}/sendVideo"
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", content_type)

    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode("utf-8"))

    if not res.get("ok"):
        raise RuntimeError(f"Telegram sendVideo failed: {res}")

    result = res.get("result", {})
    message_id = result.get("message_id")
    clean_channel = target_channel.lstrip("@")
    post_url = f"https://t.me/{clean_channel}/{message_id}"

    return {
        "success": True,
        "message_id": message_id,
        "channel": target_channel,
        "url": post_url
    }

def publish_telegram_carousel(slide_paths: list[str], caption: str, channel: str = None) -> dict:
    """
    Publishes a multi-slide carousel (album) to Telegram channel via sendMediaGroup.
    """
    token, default_channel = load_telegram_credentials()
    target_channel = channel or default_channel

    if not slide_paths:
        raise ValueError("No slide paths provided for carousel")

    # Telegram sendMediaGroup accepts between 2 and 10 items
    slides = slide_paths[:10]
    safe_caption = format_caption(caption)

    media = []
    files = []

    for i, slide_path in enumerate(slides):
        if not os.path.exists(slide_path):
            raise FileNotFoundError(f"Slide not found: {slide_path}")

        field_name = f"slide_{i}"
        item = {
            "type": "photo",
            "media": f"attach://{field_name}"
        }
        if i == 0:
            item["caption"] = safe_caption

        media.append(item)

        with open(slide_path, "rb") as f:
            slide_bytes = f.read()

        filename = os.path.basename(slide_path)
        mime = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
        files.append((field_name, filename, mime, slide_bytes))

    fields = {
        "chat_id": target_channel,
        "media": json.dumps(media)
    }

    body, content_type = make_multipart_body(fields, files)

    url = f"https://api.telegram.org/bot{token}/sendMediaGroup"
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", content_type)

    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode("utf-8"))

    if not res.get("ok"):
        raise RuntimeError(f"Telegram sendMediaGroup failed: {res}")

    results = res.get("result", [])
    first_msg_id = results[0].get("message_id") if results else None
    clean_channel = target_channel.lstrip("@")
    post_url = f"https://t.me/{clean_channel}/{first_msg_id}" if first_msg_id else f"https://t.me/{clean_channel}"

    return {
        "success": True,
        "message_ids": [m.get("message_id") for m in results],
        "channel": target_channel,
        "url": post_url
    }

def main():
    parser = argparse.ArgumentParser(description="A-Pay Telegram Channel Publisher")
    parser.add_argument("--video", type=str, help="MP4 video path to publish via sendVideo")
    parser.add_argument("--slides", nargs="+", help="Image slide paths for carousel album via sendMediaGroup")
    parser.add_argument("--caption", type=str, required=True, help="Post caption")
    parser.add_argument("--channel", type=str, default=None, help="Target channel (default: @apay_protocol)")

    args = parser.parse_args()

    if args.video:
        print(f"🚀 Publishing Video Reel to Telegram Channel ({args.channel or '@apay_protocol'})...")
        res = publish_telegram_video(args.video, args.caption, args.channel)
        print(f"✅ TELEGRAM VIDEO LIVE: {res['url']}")
        print(json.dumps(res, indent=2))
    elif args.slides:
        print(f"🚀 Publishing {len(args.slides)}-Slide Carousel Album to Telegram Channel ({args.channel or '@apay_protocol'})...")
        res = publish_telegram_carousel(args.slides, args.caption, args.channel)
        print(f"✅ TELEGRAM CAROUSEL LIVE: {res['url']}")
        print(json.dumps(res, indent=2))
    else:
        print("❌ Error: Must specify either --video or --slides")
        sys.exit(1)

if __name__ == "__main__":
    main()
