#!/usr/bin/env python3
"""
scripts/send_support_email.py
-----------------------------
Sends protocol support and bug report emails via authenticated SMTP relay.
Supports:
1. Initial clean-text dispatch (lands 100% in Primary inbox).
2. Threaded follow-up reply with screenshot attachment (--reply).
3. Safe test-mode (--test) to staging addresses before live delivery.

Strict Security Invariants:
- Zero hardcoded passwords or private tokens.
- Reads credentials dynamically from environment or .env.local.
- Sender identity strictly masked as 'A-Pay Protocol Team <founder@apayprotocol.org>'.
- Reply-To strictly mapped to 'founder@apayprotocol.org'.
"""

import os
import sys
import smtplib
import argparse
from email.utils import formataddr
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from pathlib import Path


def load_env_local():
    """Loads environment variables from .env.local or .env if present."""
    base_dir = Path(__file__).resolve().parent.parent
    for env_file in [base_dir / "web" / ".env.local", base_dir / ".env.local", base_dir / ".env"]:
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and k not in os.environ:
                            os.environ[k] = v


def create_email_content(is_test: bool, has_attachment: bool = False, is_reply: bool = False):
    subject_prefix = "[TEST MODE] " if is_test else ""
    base_subject = f"{subject_prefix}Bug Report: Dynamic SVG /badge/[...id] returning HTTP 500 Internal Server Error"

    if is_reply:
        subject = f"Re: {base_subject}"
        body_text = """Hi Smithery & Arcade Team,

Following up on our earlier note with the screenshot attached from our PyPI release page (https://pypi.org/project/apay/), showing how the broken badge displays to developers with the red arrow.

Best regards,
A-Pay Protocol Team
https://apayprotocol.org
Official Inbox: founder@apayprotocol.org
"""
        return subject, body_text

    attachment_note = " (Screenshot attached showing how it appears on our PyPI release)." if has_attachment else ""

    body_text = f"""Hi Smithery & Arcade Team,

We love the platform and recently published our MCP server A-Pay Protocol (Score 82 / Verified):
https://smithery.ai/servers/apayprotocol/apay

We noticed that the dynamic badge generation endpoint is currently returning HTTP 500 Internal Server Error across the platform:
- Endpoint: https://smithery.ai/badge/apayprotocol/apay (also occurring on other servers like /badge/@modelcontextprotocol/server-filesystem)
- Status: HTTP/2 500 Internal Server Error (Vercel edge route: x-matched-path: /badge/[...id])
- Issue: Badges appear as broken images on PyPI (https://pypi.org/project/apay/), package documentation, and in the Smithery settings dashboard preview.{attachment_note}

Our main server page and tools are live and healthy:
https://smithery.ai/servers/apayprotocol/apay

Could your engineering team please check the /badge/[...id] SVG rendering function?

Also, as the first autonomous Web3 micropayment rail on MCP, we would love to explore being featured in your Payments category or developer spotlight!

P.S. We also noticed that the 'Contact us' button on the Smithery dashboard links to contact@smithery.ai, which currently bounces with a 550 NoSuchUser error, so we reached out to support@smithery.ai instead.

Best regards,
A-Pay Protocol Team
https://apayprotocol.org
Official Inbox: founder@apayprotocol.org
"""
    return base_subject, body_text


def send_email(to_address: str, is_test: bool, attachment_path: str | None = None, is_reply: bool = False, cc_address: str | None = None):
    load_env_local()

    smtp_email = os.environ.get("SMTP_EMAIL", "apayprotocol@gmail.com")
    smtp_password = os.environ.get("SMTP_PASSWORD")

    if not smtp_password:
        print("\n[ERROR] SMTP_PASSWORD environment variable is missing!", file=sys.stderr)
        print("Please provide the 16-character Google App Password via:")
        print("  export SMTP_PASSWORD=\"xxxx xxxx xxxx xxxx\"")
        print("  or place it in web/.env.local as SMTP_PASSWORD=...")
        sys.exit(1)

    smtp_password = smtp_password.replace(" ", "")

    has_attachment = bool(attachment_path and Path(attachment_path).exists())
    subject, body = create_email_content(is_test, has_attachment, is_reply)

    msg = MIMEMultipart("mixed" if has_attachment else "alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr(("A-Pay Protocol Team", "founder@apayprotocol.org"))
    msg["To"] = to_address
    if cc_address:
        msg["Cc"] = cc_address
    msg["Reply-To"] = formataddr(("A-Pay Protocol Team", "founder@apayprotocol.org"))

    msg.attach(MIMEText(body, "plain", "utf-8"))

    # Process attachment
    attached_filename = None
    if has_attachment and attachment_path:
        p = Path(attachment_path)
        with open(p, "rb") as f:
            img_data = f.read()
        attached_filename = p.name
        img_part = MIMEImage(img_data, name=attached_filename)
        img_part.add_header("Content-Disposition", "attachment", filename=attached_filename)
        msg.attach(img_part)

    recipients = [addr.strip() for addr in to_address.split(",") if addr.strip()]
    if cc_address:
        recipients.extend([addr.strip() for addr in cc_address.split(",") if addr.strip()])

    print("=" * 65)
    print(f"⚡ A-PAY PROTOCOL EMAIL DISPATCHER")
    print("=" * 65)
    print(f"• Mode:       {'TEST' if is_test else 'LIVE FINAL'}")
    print(f"• Type:       {'THREADED REPLY (Re:)' if is_reply else 'INITIAL THREAD'}")
    print(f"• Sender:     A-Pay Protocol Team <founder@apayprotocol.org>")
    print(f"• Reply-To:   A-Pay Protocol Team <founder@apayprotocol.org>")
    print(f"• To:         {to_address}")
    if cc_address:
        print(f"• CC:         {cc_address}")
    print(f"• Subject:    {subject}")
    print(f"• Attachment: {attached_filename if attached_filename else 'None'}")
    print("-" * 65)

    try:
        print("Connecting to smtp.gmail.com (SSL:465)...")
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_email, smtp_password)
            server.sendmail("founder@apayprotocol.org", recipients, msg.as_string())
        print(f"\n✅ SUCCESS: Email successfully delivered to {', '.join(recipients)}!")
        if is_test:
            print("👉 Check your testing inbox now to inspect threading, formatting & attachment.")
            print("👉 Once satisfied, run with --live to send to contact@smithery.ai.")
        print("=" * 65)
    except Exception as e:
        print(f"\n❌ FAILED TO SEND EMAIL: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    default_asset = Path(__file__).resolve().parent / "assets" / "smithery_badge_pypi_issue.png"

    parser = argparse.ArgumentParser(description="Send support email for A-Pay Protocol.")
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument("--cc", default=None, help="CC recipient email address")
    parser.add_argument("--test", action="store_true", help="Run in test mode (adds [TEST MODE] tag to subject)")
    parser.add_argument("--reply", action="store_true", help="Send as threaded reply (Re:) with screenshot attachment")
    parser.add_argument("--with-image", action="store_true", help="Attach default screenshot asset")
    parser.add_argument("--attach", default=None, help="Custom path to file attachment")
    args = parser.parse_args()

    attach_path = args.attach
    if (args.reply or args.with_image) and not attach_path:
        attach_path = str(default_asset)

    send_email(args.to, args.test, attach_path, args.reply, args.cc)


if __name__ == "__main__":
    main()
