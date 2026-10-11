# 🚀 A-Pay Monetized FastAPI Agent

A production-ready FastAPI service protected by **A-Pay HTTP 402 Protocol** on Base Layer 2.

## ⚡ Quickstart

1. Install dependencies:
   ```bash
   uv sync
   # or: pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and set your payout wallet:
   ```bash
   cp .env.example .env
   ```

3. Run the server:
   ```bash
   uv run uvicorn main:app --reload --port 8000
   ```

4. Test with an autonomous agent:
   ```bash
   uv run apay session get http://localhost:8000/api/agent
   ```
