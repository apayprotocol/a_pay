"""Lightweight mock upstream API server for Docker / Cloudflare integration tests."""

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("UPSTREAM_PORT", "3000"))


class MockHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        response = {
            "status": "success",
            "service": "AlphaInsights Protected Intelligence API",
            "path": self.path,
            "secret_alpha": "Confidential market report unlocked via A-Pay x402 payment rail.",
            "timestamp": 1700000000,
        }
        self.wfile.write(json.dumps(response).encode("utf-8"))

    def do_POST(self) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        response = {
            "status": "success",
            "message": "POST request received and processed.",
            "received_body": body,
        }
        self.wfile.write(json.dumps(response).encode("utf-8"))

    def log_message(self, format: str, *args: object) -> None:
        pass


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), MockHandler)
    print(f"Mock Upstream API listening on port {PORT}...")
    server.serve_forever()
