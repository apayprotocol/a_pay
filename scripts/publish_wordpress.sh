#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "⚡ A-PAY WordPress.org SVN Publishing Engine (v0.1.9)"
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

mkdir -p "$SVN_DIR/tags/0.1.9"
cp packages/wordpress-plugin/apay-web3-ai-paywall.php "$SVN_DIR/tags/0.1.9/"
cp packages/wordpress-plugin/readme.txt "$SVN_DIR/tags/0.1.9/"

nix-shell -p subversion --run "cd $SVN_DIR && svn add tags/0.1.9 2>/dev/null || true"

echo ""
echo "📋 SVN Working Copy Status:"
nix-shell -p subversion --run "cd $SVN_DIR && svn status"

echo ""
echo "=================================================="
echo "🚀 Ready to commit v0.1.9 to official WordPress.org SVN!"
echo "   Target   : https://plugins.svn.wordpress.org/apay-web3-ai-paywall"
echo "   Username : apay98"
echo "=================================================="

if [ -n "${WP_ORG_PASSWORD:-}" ]; then
    echo "🔑 Committing with WP_ORG_PASSWORD..."
    nix-shell -p subversion --run "cd $SVN_DIR && svn ci -m 'Release 0.1.9: Zero-config auto domain escrow, WooCommerce 1-click refund engine, HPOS compatibility' --username apay98 --password \"$WP_ORG_PASSWORD\" --non-interactive"
    echo "🎉 WordPress plugin v0.1.9 successfully published to WordPress.org!"
else
    echo "💡 Run this command to prompt for your password securely:"
    echo "   nix-shell -p subversion --run \"cd packages/wordpress-plugin/dist/svn && svn ci -m 'Release 0.1.9: Zero-config auto domain escrow, WooCommerce 1-click refund engine, HPOS compatibility' --username apay98\""
    echo ""
    echo "Or set WP_ORG_PASSWORD and re-run:"
    echo "   export WP_ORG_PASSWORD=\"your_password\""
    echo "   ./scripts/publish_wordpress.sh"
fi
