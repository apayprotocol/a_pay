#!/usr/bin/env bash
set -euo pipefail

if [ -z "${WP_ORG_PASSWORD:-}" ] && [ -f ".env" ]; then
    WP_ORG_PASSWORD=$(grep -m1 '^WP_ORG_PASSWORD=' .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
fi

VERSION=$(grep -m1 '^Stable tag:' packages/wordpress-plugin/readme.txt | awk -F':' '{print $2}' | tr -d '[:space:]')
if [ -z "$VERSION" ]; then
    echo "❌ Could not detect Stable tag from packages/wordpress-plugin/readme.txt"
    exit 1
fi

COMMIT_MSG="Release ${VERSION}: WordPress 7.2 & PHP 8.6 compatibility, Plugin Check compliance, security hardening"

echo "=================================================="
echo "⚡ A-PAY WordPress.org SVN Publishing Engine (v${VERSION})"
echo "=================================================="

SVN_DIR="packages/wordpress-plugin/dist/svn"

if [ ! -d "$SVN_DIR" ]; then
    echo "📦 Checking out fresh SVN working tree..."
    mkdir -p "$SVN_DIR"
    nix-shell -p subversion --run "svn checkout https://plugins.svn.wordpress.org/apay-web3-ai-paywall $SVN_DIR"
fi

echo "📦 Syncing latest packages/wordpress-plugin files to SVN working tree..."
cp packages/wordpress-plugin/apay-web3-ai-paywall.php "$SVN_DIR/trunk/"
cp packages/wordpress-plugin/readme.txt "$SVN_DIR/trunk/"

mkdir -p "$SVN_DIR/tags/${VERSION}"
cp packages/wordpress-plugin/apay-web3-ai-paywall.php "$SVN_DIR/tags/${VERSION}/"
cp packages/wordpress-plugin/readme.txt "$SVN_DIR/tags/${VERSION}/"

nix-shell -p subversion --run "cd $SVN_DIR && svn add --force tags/${VERSION} 2>/dev/null || true"

echo ""
echo "📋 SVN Working Copy Status:"
nix-shell -p subversion --run "cd $SVN_DIR && svn status"

echo ""
echo "=================================================="
echo "🚀 Ready to commit v${VERSION} to official WordPress.org SVN!"
echo "   Target   : https://plugins.svn.wordpress.org/apay-web3-ai-paywall"
echo "   Username : apay98"
echo "=================================================="

if [ -n "${WP_ORG_PASSWORD:-}" ]; then
    echo "🔑 Committing with WP_ORG_PASSWORD..."
    nix-shell -p subversion --run "cd $SVN_DIR && svn ci -m '${COMMIT_MSG}' --username apay98 --password \"$WP_ORG_PASSWORD\" --no-auth-cache --non-interactive"
    echo "🎉 WordPress plugin v${VERSION} successfully published to WordPress.org!"
else
    echo "🔑 Attempting commit with cached SVN credentials (~/.subversion/auth)..."
    if nix-shell -p subversion --run "cd $SVN_DIR && svn ci -m '${COMMIT_MSG}' --username apay98 --non-interactive"; then
        echo "🎉 WordPress plugin v${VERSION} successfully published to WordPress.org!"
    else
        echo "⚠️ Cached SVN auth failed or expired. Set WP_ORG_PASSWORD and re-run:"
        echo "   export WP_ORG_PASSWORD=\"your_password\""
        echo "   ./scripts/publish_wordpress.sh"
        exit 1
    fi
fi
