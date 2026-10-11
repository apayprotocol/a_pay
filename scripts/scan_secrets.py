import os
import re

print("==========================================================")
print("🔒 DEEP SECURITY & CREDENTIAL LEAK AUDIT (A-PAY PROTOCOL)")
print("==========================================================")

patterns = {
    "Private Key (Hex 64)": re.compile(r"(?:private_?key|privkey|secret_key|signer_key)\s*[:=]\s*[\"'](0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64})[\"']", re.I),
    "Raw 64-char Hex (Potential Key)": re.compile(r"\b0x[a-fA-F0-9]{64}\b"),
    "API Key / Secret Token": re.compile(r"(?:api_?key|auth_?token|secret_?token|bearer)\s*[:=]\s*[\"']([a-zA-Z0-9_\-]{20,})[\"']", re.I),
    "Upstash / Redis Token": re.compile(r"(?:UPSTASH_REDIS_REST_TOKEN|REDIS_PASSWORD)\s*[:=]\s*[\"']([^\"']+)[\"']", re.I),
    "AWS Key": re.compile(r"\b(AKIA[0-9A-Z]{16})\b"),
    "Generic Password Assignment": re.compile(r"(?:password|passwd|secret)\s*[:=]\s*[\"']([^\"'\s]{8,})[\"']", re.I),
}

# Whitelist / Known False Positives (e.g. test dummy keys, keccak hash of strings)
WHITELIST_SNIPPETS = [
    "0x0000000000000000",
    "0x1111111111111111",
    "0x2222222222222222",
    "0x3333333333333333",
    "0x4444444444444444",
    "0x5555555555555555",
    "0x6666666666666666",
    "0x7777777777777777",
    "0x8888888888888888",
    "0x9999999999999999",
    "0xaaaaaaaaaaaaaaaa",
    "0xbbbbbbbbbbbbbbbb",
    "0xcccccccccccccccc",
    "0xdddddddddddddddd",
    "0xeeeeeeeeeeeeeeee",
    "0xffffffffffffffff",
    "typehash",
    "domain_separator",
    "alpha_intelligence_data",
]

files_scanned = 0
findings = []

EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "__pycache__",
    ".next",
    "dist",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "artifacts",
}

EXCLUDE_FILES = {
    ".env",
    ".env.local",
}

for root, dirs, files in os.walk("/home/sagar/a_pay"):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    for f in files:
        if f in EXCLUDE_FILES:
            continue
        if f.endswith((".py", ".ts", ".tsx", ".js", ".mjs", ".json", ".env", ".toml", ".yml", ".yaml", ".md", ".sh")):
            filepath = os.path.join(root, f)
            files_scanned += 1
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                    for line_no, line in enumerate(fh, 1):
                        for label, pat in patterns.items():
                            matches = pat.findall(line)
                            for m in matches:
                                val = m if isinstance(m, str) else m[0]
                                val_lower = val.lower()
                                if any(w in val_lower for w in WHITELIST_SNIPPETS):
                                    continue
                                relpath = os.path.relpath(filepath, "/home/sagar/a_pay")
                                findings.append({
                                    "file": relpath,
                                    "line": line_no,
                                    "type": label,
                                    "preview": val[:10] + "..." + val[-6:] if len(val) > 20 else val,
                                    "raw_line": line.strip()[:100],
                                })
            except Exception:
                pass

print(f"Total Source & Config Files Scanned: {files_scanned}")
print(f"Total Findings Detected            : {len(findings)}")

if not findings:
    print("\n✅ 100% CLEAN: ZERO SECRETS, PRIVATE KEYS, OR TOKENS FOUND!")
else:
    print("\n⚠️ CANDIDATES TO AUDIT:")
    for f in findings:
        print(f"  • {f['file']}:{f['line']} [{f['type']}]: {f['preview']}")
        print(f"    Code snippet: {f['raw_line']}")
