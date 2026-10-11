#!/usr/bin/env bash
# ==============================================================================
# ⚡ A-PAY PROTOCOL: AUTOMATED REPOSITORY BACKUP & BUNDLE SCRIPT
# ==============================================================================
set -euo pipefail

TIMESTAMP=$(date -u +%Y%m%d_%H%M%SZ)
BACKUP_DIR="${HOME}/a_pay_backups"
BUNDLE_FILE="${BACKUP_DIR}/a_pay_backup_${TIMESTAMP}.bundle"
LATEST_LINK="${BACKUP_DIR}/a_pay_backup_latest.bundle"

echo "⚡ [A-Pay Backup] Initializing repository state safeguard at ${TIMESTAMP}..."

mkdir -p "${BACKUP_DIR}"

# 1. Create a full standalone git bundle including all branches, tags, and commits
echo "📦 [1/3] Creating standalone Git bundle..."
git bundle create "${BUNDLE_FILE}" --all

# 2. Verify bundle cryptographic integrity
echo "🔍 [2/3] Verifying bundle integrity..."
git bundle verify "${BUNDLE_FILE}"

# 3. Create/update a convenient 'latest' pointer
echo "🔗 [3/3] Updating latest bundle pointer..."
ln -sf "${BUNDLE_FILE}" "${LATEST_LINK}"

echo "=============================================================================="
echo "✅ Backup successfully created and verified!"
echo "📁 Archive Location: ${BUNDLE_FILE}"
echo "📊 Bundle Size: $(du -h "${BUNDLE_FILE}" | cut -f1)"
echo "💡 To restore or clone from this bundle anywhere:"
echo "   git clone ${BUNDLE_FILE} a_pay_restored"
echo "=============================================================================="
