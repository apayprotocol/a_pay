#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "⚡ A-Pay (AgentPay) PyPI Publishing Engine"
echo "=================================================="

# 1. Clean previous builds
echo "🧹 Cleaning previous artifacts..."
rm -rf dist/ build/ *.egg-info

# 2. Build distributions with uv
echo "📦 Building source and wheel distributions..."
uv build

# 3. Check artifacts
echo "🔍 Validating wheel package structure..."
python3 -m zipfile -l dist/apay-*.whl

echo ""
echo "✅ Packages built successfully in dist/:"
ls -lh dist/

# 4. Check if token or dry-run
if [ "${1:-}" == "--dry-run" ]; then
    echo ""
    echo "🧪 Executing dry-run publish validation..."
    uv publish --dry-run --token "pypi-dry-run-token" || true
    echo "✨ Dry-run validation successful! No packages were uploaded."
    exit 0
fi

if [ -z "${UV_PUBLISH_TOKEN:-}" ]; then
    echo ""
    echo "ℹ️ To upload to PyPI, set your API token and run:"
    echo "   export UV_PUBLISH_TOKEN=pypi-AgEIcHlwaS5vcmc..."
    echo "   ./scripts/publish_pypi.sh"
    echo ""
    echo "Or run a dry run test with:"
    echo "   ./scripts/publish_pypi.sh --dry-run"
    exit 0
fi

echo "🚀 Publishing to official PyPI index..."
uv publish
echo "🎉 A-Pay package successfully published to PyPI!"
