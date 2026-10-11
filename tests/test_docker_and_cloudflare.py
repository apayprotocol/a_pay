"""Test suite for Docker and Cloudflare edge deployment configurations."""

from __future__ import annotations

import subprocess
from pathlib import Path

from click.testing import CliRunner

from apay.cli import main


def test_cli_protect_envvar_mapping():
    """Verify apay protect correctly binds environment variables."""
    runner = CliRunner()
    result = runner.invoke(main, ["protect", "--help"])
    assert result.exit_code == 0
    assert "--target" in result.output
    assert "--price" in result.output
    assert "--wallet" in result.output
    assert "--redis-url" in result.output


def test_cloudflare_worker_files_integrity():
    """Verify Cloudflare Worker manifest, documentation, and configuration files exist."""
    cf_dir = Path("cloudflare")
    assert (cf_dir / "worker.js").exists(), "worker.js must exist"
    assert (cf_dir / "wrangler.toml").exists(), "wrangler.toml must exist"
    assert (cf_dir / "README.md").exists(), "README.md must exist"

    # Verify wrangler.toml contains required fields
    content = (cf_dir / "wrangler.toml").read_text()
    assert "RECEIVER_WALLET" in content
    assert "PRICE_USDC" in content
    assert "MONETIZE_AI_ONLY" in content


def test_cloudflare_worker_execution_via_node():
    """Verify Cloudflare Worker edge execution and AI crawler detection using Node runtime."""
    node_test_script = """
import worker from './cloudflare/worker.js';

async function run() {
  const env = {
    RECEIVER_WALLET: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    PRICE_USDC: '0.001',
    MONETIZE_AI_ONLY: 'true',
  };

  // 1. Diagnostics endpoint
  const r1 = await worker.fetch(new Request('http://localhost/.apay/status'), env, {});
  if (r1.status !== 200) throw new Error('Status failed');
  const d1 = await r1.json();
  if (d1.protocol !== 'A-Pay') throw new Error('Protocol signature missing');

  // 2. AI Scraper intercepted with HTTP 402
  const r2 = await worker.fetch(new Request('http://localhost/api/data', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)' }
  }), env, {});
  if (r2.status !== 402) throw new Error('AI crawler was not challenged');
  if (!r2.headers.get('X-APay-Nonce')) throw new Error('Missing X-APay-Nonce header');
  const d2 = await r2.json();
  if (d2.pricing.amount_base_units !== '1000') throw new Error('Incorrect pricing units');

  // 3. CORS OPTIONS preflight
  const r3 = await worker.fetch(new Request('http://localhost/api/data', {
    method: 'OPTIONS'
  }), env, {});
  if (r3.status !== 204) throw new Error('CORS preflight failed');

  console.log('CLOUDFLARE_WORKER_VERIFIED');
}

run().catch(e => { console.error(e); process.exit(1); });
"""
    result = subprocess.run(
        ["node", "-e", node_test_script],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, f"Node test failed: {result.stderr}"
    assert "CLOUDFLARE_WORKER_VERIFIED" in result.stdout


def test_dockerfile_and_compose_manifests():
    """Verify Dockerfile and docker-compose.yml configurations are valid."""
    dockerfile = Path("Dockerfile")
    assert dockerfile.exists()
    dockerfile_text = dockerfile.read_text()
    assert "FROM python:3.13-slim" in dockerfile_text
    assert 'ENTRYPOINT ["apay", "protect"]' in dockerfile_text

    compose = Path("docker-compose.yml")
    assert compose.exists()
    compose_text = compose.read_text()
    assert "apay-gateway" in compose_text
    assert "apay-redis" in compose_text
    assert "mock-upstream" in compose_text
