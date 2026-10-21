#!/usr/bin/env python3
"""
LinkedIn OAuth 2.0 Local Helper for A-Pay Protocol
Bypasses LinkedIn's glitchy frontend web tool by generating the token directly via standard OAuth 2.0 Authorization Code flow.
"""

import os
import sys
import json
import secrets
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env.linkedin")

REDIRECT_URI = "http://localhost:8080/callback"
PORT = 8080

def load_or_get_creds():
    client_id = os.environ.get("LINKEDIN_CLIENT_ID", "863hqtuqnyeaea")
    client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET", "")
    
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k == "LINKEDIN_CLIENT_ID":
                        client_id = v
                    elif k == "LINKEDIN_CLIENT_SECRET":
                        client_secret = v
    
    return client_id, client_secret

def exchange_code_for_token(code: str, client_id: str, client_secret: str):
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    payload = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": REDIRECT_URI
    }).encode("utf-8")

    req = urllib.request.Request(token_url, data=payload, headers={
        "Content-Type": "application/x-www-form-urlencoded"
    })

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Token exchange failed (HTTP {e.code}): {error_body}")

def save_token_to_env(access_token: str, client_id: str, client_secret: str):
    existing = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    existing[k.strip()] = v.strip()

    existing["LINKEDIN_CLIENT_ID"] = f'"{client_id}"'
    existing["LINKEDIN_CLIENT_SECRET"] = f'"{client_secret}"'
    existing["LINKEDIN_ACCESS_TOKEN"] = f'"{access_token}"'

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        for k, v in existing.items():
            f.write(f"{k}={v}\n")

def main():
    client_id, client_secret = load_or_get_creds()
    
    if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
        client_secret = sys.argv[1]

    if not client_secret:
        print("❌ Error: LINKEDIN_CLIENT_SECRET is required!")
        print("Usage: python3 scripts/linkedin_oauth_helper.py <CLIENT_SECRET>")
        print(f"Or add LINKEDIN_CLIENT_SECRET to {ENV_PATH}")
        sys.exit(1)

    # Direct code exchange mode
    if "--code" in sys.argv:
        idx = sys.argv.index("--code")
        if idx + 1 < len(sys.argv):
            raw = sys.argv[idx + 1]
            if "code=" in raw:
                parsed = urllib.parse.urlparse(raw)
                code = urllib.parse.parse_qs(parsed.query).get("code", [""])[0]
            else:
                code = raw
            print(f"🔄 Exchanging authorization code for 60-day token...")
            try:
                token_data = exchange_code_for_token(code, client_id, client_secret)
                access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 5184000)
                days = expires_in // 86400

                save_token_to_env(access_token, client_id, client_secret)
                print("\n" + "="*70)
                print("🎉 SUCCESS! LinkedIn Access Token generated and saved!")
                print(f"📁 Saved to   : {ENV_PATH}")
                print(f"⏳ Valid for  : {days} days")
                print("="*70 + "\n")
                return
            except Exception as e:
                print(f"❌ Error exchanging code: {e}")
                sys.exit(1)

    state = "apay_protocol_oauth_state"
    scopes = "w_member_social openid profile email"
    encoded_scopes = urllib.parse.quote(scopes)
    encoded_redirect = urllib.parse.quote(REDIRECT_URI)

    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&client_id={client_id}&"
        f"redirect_uri={encoded_redirect}&scope={encoded_scopes}&state={state}"
    )

    if "--url-only" in sys.argv:
        print(auth_url)
        return

    print("\n" + "="*70)
    print("🔑 LINKEDIN OAUTH 2.0 AUTHORIZATION HELPER (A-PAY PROTOCOL)")
    print("="*70)
    print(f"1. Make sure `{REDIRECT_URI}` is added in LinkedIn Developer Portal")
    print("   under App > Auth > Authorized redirect URLs for your app.")
    print("\n2. Open this URL in your browser:\n")
    print(f"👉 {auth_url}\n")
    print(f"3. Waiting for authorization callback on {REDIRECT_URI} ...")
    print("="*70 + "\n")

    auth_code_holder = {}

    class CallbackHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed_path = urllib.parse.urlparse(self.path)
            if parsed_path.path == "/callback":
                query = urllib.parse.parse_qs(parsed_path.query)
                received_state = query.get("state", [""])[0]
                code = query.get("code", [""])[0]

                if received_state != state:
                    self.send_response(400)
                    self.send_header("Content-Type", "text/html")
                    self.end_headers()
                    self.wfile.write(b"<h3>State verification failed. CSRF detected.</h3>")
                    return

                if code:
                    auth_code_holder["code"] = code
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html")
                    self.end_headers()
                    self.wfile.write(b"""
                    <html>
                    <body style="font-family: system-ui, sans-serif; text-align: center; padding: 60px; background: #07080B; color: #fff;">
                        <h2 style="color: #0052FF;">&#10004; LinkedIn Connected Successfully!</h2>
                        <p style="color: #94A3B8; font-size: 16px;">OAuth token has been received and saved. You can close this tab now.</p>
                    </body>
                    </html>
                    """)
                else:
                    error = query.get("error_description", ["Unknown error"])[0]
                    self.send_response(400)
                    self.send_header("Content-Type", "text/html")
                    self.end_headers()
                    self.wfile.write(f"<h3>Authorization Error: {error}</h3>".encode("utf-8"))
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format, *args):
            return  # Suppress default server logs

    server = HTTPServer(("127.0.0.1", PORT), CallbackHandler)
    server.timeout = 180  # 3 minutes timeout

    while "code" not in auth_code_holder:
        server.handle_request()

    code = auth_code_holder["code"]
    print("✅ Authorization code received from browser callback!")
    print("🔄 Exchanging code for 60-day Access Token...")

    try:
        token_data = exchange_code_for_token(code, client_id, client_secret)
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 5184000)
        days = expires_in // 86400

        save_token_to_env(access_token, client_id, client_secret)
        print("\n" + "="*70)
        print("🎉 SUCCESS! LinkedIn Access Token generated and saved!")
        print(f"📁 Saved to   : {ENV_PATH}")
        print(f"⏳ Valid for  : {days} days")
        print("="*70 + "\n")
    except Exception as e:
        print(f"\n❌ Error exchanging code for token: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
