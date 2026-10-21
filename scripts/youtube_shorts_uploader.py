#!/usr/bin/env python3
"""
YouTube Shorts Automated Uploader for A-Pay Protocol
Target Channel: AI_P∆Y (Channel ID: UC1QPADVMTgNvt_B7Iui7PgA)

Compliant with A-Pay Protocol Anti-Leak & Zero Credential Exposure Invariants.
Credentials stored in local untracked `youtube_token.json` / `client_secret_youtube.json`.
"""

import os
import sys
import json
import time
import argparse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLIENT_SECRETS_PATH = os.path.join(BASE_DIR, "client_secret_youtube.json")
TOKEN_PATH = os.path.join(BASE_DIR, "youtube_token.json")

# Scopes for uploading and managing YouTube videos
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
]

def get_authenticated_service():
    """Authenticates using stored token or initiates one-time OAuth flow."""
    creds = None
    if os.path.exists(TOKEN_PATH):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        except Exception as e:
            print(f"⚠️ Error reading stored token: {e}")

    # If no valid credentials, refresh or initiate flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing expired YouTube OAuth token...")
            try:
                creds.refresh(Request())
                with open(TOKEN_PATH, "w", encoding="utf-8") as token_file:
                    token_file.write(creds.to_json())
                print("✅ Token refreshed successfully!")
            except Exception as e:
                print(f"❌ Failed to refresh token: {e}")
                creds = None

        if not creds:
            if not os.path.exists(CLIENT_SECRETS_PATH):
                raise FileNotFoundError(
                    f"\n❌ Missing '{CLIENT_SECRETS_PATH}'.\n"
                    f"Please place your Google Cloud OAuth Client ID JSON at:\n"
                    f"{CLIENT_SECRETS_PATH}\n\n"
                    f"Steps:\n"
                    f"1. Go to console.cloud.google.com\n"
                    f"2. Enable 'YouTube Data API v3'\n"
                    f"3. Credentials > Create Credentials > OAuth client ID (Desktop app)\n"
                    f"4. Download JSON and save as 'client_secret_youtube.json'"
                )
            
            print("\n🔑 Initiating One-Time YouTube OAuth Authorization...")
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_PATH, SCOPES)
            try:
                # Try local server first (port 8080 or random port)
                creds = flow.run_local_server(port=8080, prompt="consent", access_type="offline")
            except Exception:
                # Fallback to console link if headless or port busy
                creds = flow.run_console()

            with open(TOKEN_PATH, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())
            print(f"✅ YouTube OAuth authorization successful! Saved to {TOKEN_PATH}")

    return build("youtube", "v3", credentials=creds)

def check_channel_status():
    """Verifies connected YouTube channel details."""
    youtube = get_authenticated_service()
    request = youtube.channels().list(mine=True, part="snippet,statistics")
    response = request.execute()

    items = response.get("items", [])
    if not items:
        print("❌ No YouTube channel found for the authenticated account.")
        return

    ch = items[0]
    snippet = ch.get("snippet", {})
    stats = ch.get("statistics", {})

    print("==================================================")
    print("📺 YOUTUBE CHANNEL CONNECTION VERIFIED")
    print("==================================================")
    print(f"Channel Title : {snippet.get('title')}")
    print(f"Channel ID    : {ch.get('id')}")
    print(f"Custom URL    : {snippet.get('customUrl', 'N/A')}")
    print(f"Subscribers   : {stats.get('subscriberCount', 0)}")
    print(f"Total Views   : {stats.get('viewCount', 0)}")
    print(f"Total Videos  : {stats.get('videoCount', 0)}")
    print("==================================================")

def upload_short(video_path: str, title: str, description: str, tags: list = None, privacy_status: str = "public"):
    """
    Uploads a vertical 9:16 video to YouTube.
    Adding #Shorts in title/description automatically registers it as a YouTube Short.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # Ensure #Shorts tag exists for YouTube algorithmic classification
    if "#Shorts" not in title and "#shorts" not in title:
        title = f"{title} #Shorts"
    if "#Shorts" not in description and "#shorts" not in description:
        description = f"{description}\n\n#Shorts #YouTubeShorts"

    default_tags = ["shorts", "youtubeshorts", "web3", "wordpress", "ai", "basechain", "apayprotocol", "monetization", "crypto"]
    if tags:
        default_tags = list(set(default_tags + tags))

    youtube = get_authenticated_service()

    body = {
        "snippet": {
            "title": title[:100],  # Max 100 chars
            "description": description[:5000],
            "tags": default_tags,
            "categoryId": "28"  # 28 = Science & Technology
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(
        video_path,
        mimetype="video/mp4",
        chunksize=1024 * 1024 * 2,  # 2MB chunks
        resumable=True
    )

    print(f"🚀 Uploading YouTube Short: '{title}'...")
    print(f"File Path: {video_path} ({os.path.getsize(video_path) / 1024:.1f} KB)")
    
    insert_request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = insert_request.next_chunk()
        if status:
            progress = int(status.progress() * 100)
            print(f"  • Upload progress: {progress}%...", end="\r", flush=True)

    video_id = response.get("id")
    shorts_url = f"https://www.youtube.com/shorts/{video_id}"
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    print(f"\n🎉 YOUTUBE SHORT PUBLISHED LIVE!")
    print(f"Video ID   : {video_id}")
    print(f"Shorts URL : {shorts_url}")
    print(f"Watch URL  : {video_url}")

    return {
        "video_id": video_id,
        "shorts_url": shorts_url,
        "watch_url": video_url
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="A-Pay Protocol YouTube Shorts Uploader")
    parser.add_argument("command", choices=["status", "auth", "upload"], help="Command to run")
    parser.add_argument("--video", type=str, default="scripts/assets/reel_assets/sample_cyberpunk_reel.mp4", help="Video path")
    parser.add_argument("--title", type=str, default="AI Doesn't Need Water. It Needs YOUR Data. ⚡ #Shorts", help="Video title")
    parser.add_argument("--privacy", choices=["public", "unlisted", "private"], default="public", help="Video privacy")

    args = parser.parse_args()

    if args.command == "auth":
        get_authenticated_service()
        check_channel_status()
    elif args.command == "status":
        check_channel_status()
    elif args.command == "upload":
        desc = """AI doesn't need your water. It needs your DATA.

In 2026, gold is just metal. High-quality human data is the new gold.

Right now, multi-billion dollar AI models are scraping tutorials and research for free. 42% of readers block ads anyway.

Stop giving away the new gold:
With the "A-Pay Web3 AI Paywall" WordPress plugin:
• HTTP 402 forces AI bots to pay micro-settlements on Base L2.
• Genuine human readers 1-click micro-pay ($0.05) with zero forms.
• Server bandwidth drain cut by 50%.
• 2-second settlement into your self-custody wallet.

---
💬 Drop a comment with "DATA" below, and I'll send you the 1-click WordPress plugin setup guide & live demo!

#WordPress #DataIsTheNewGold #WebScraping #AIPaywall #Reels #Cyberpunk #BaseChain #Web3 #APayProtocol #Shorts #YouTubeShorts"""

        upload_short(args.video, args.title, desc, privacy_status=args.privacy)
