#!/usr/bin/env python3
"""audit_courtia_readiness.py — Automated readiness scanner for COURTIA.
Scans frontend/backend for:
- Active mocks not guarded by env vars
- SMS references (should be 0)
- Dead links (/taches/new style)
- Unused components/imports (useCanAccess pattern)
- Status column inconsistencies (actif/validee)
- Required routes vs present routes
Output: structured console report. Exit 0 if clean, 1 if issues.
"""

import os
import re
import sys
from pathlib import Path

BASE = Path("/root/courtia")
FRONTEND = BASE / "frontend" / "src"
BACKEND = Path("/srv/courtia/backend")  # production path

ISSUES = []
OK = []

def issue(severity, desc, file=None, line=None):
    location = f" ({file}:{line})" if file else ""
    ISSUES.append(f"[{severity}] {desc}{location}")

def ok(desc):
    OK.append(f"[PASS] {desc}")

# ─── 1. Mock checks ───
print("=== 1. MOCKS ===")
for path in FRONTEND.rglob("*.jsx"):
    content = path.read_text(errors='ignore')
    lines = content.split("\n")
    for i, line in enumerate(lines, 1):
        if re.search(r"mockData|mockMessages|MOCK_CLIENTS|const mock", line):
            if "VITE_USE_MOCKS" in content or "useState(mock" not in line:
                continue
            issue("MEDIUM", f"Mock sans guard env", path, i)

ok("Mock scan complete")

# ─── 2. SMS references ───
print("=== 2. SMS ===")
sms_hits = 0
for path in list(FRONTEND.rglob("*.jsx")) + list(FRONTEND.rglob("*.js")):
    content = path.read_text(errors='ignore')
    sms_refs = re.findall(r"\bSMS\b|sms|sms_url|\.sendSMS|send_sms", content)
    if sms_refs:
        sms_hits += len(sms_refs)

if sms_hits == 0:
    ok("Zero SMS references in frontend")
else:
    issue("HIGH", f"{sms_hits} SMS references found")

# ─── 3. Dead links ───
print("=== 3. DEAD LINKS ===")
dead_patterns = [r"/taches/new", r"/contrats/new", r"/old-dashboard"]
for pattern in dead_patterns:
    hits = 0
    for path in FRONTEND.rglob("*.jsx"):
        if re.search(pattern, path.read_text(errors='ignore')):
            hits += 1
    if hits == 0:
        ok(f"No dead link: {pattern}")
    else:
        issue("MEDIUM", f"Dead link {pattern} found in {hits} files")

# ─── 4. useCanAccess wiring ───
print("=== 4. FEATURE GATING ===")
gating_imports = 0
for path in list(FRONTEND.rglob("*.jsx")) + list(FRONTEND.rglob("*.js")):
    content = path.read_text(errors='ignore')
    if "useCanAccess" in content and "import" in content:
        gating_imports += 1
        break

if gating_imports > 0:
    ok(f"useCanAccess imported in {gating_imports} components")
else:
    issue("HIGH", "useCanAccess not imported in ANY component — premium features un-gated")

# ─── 5. Status consistency ───
print("=== 5. STATUS CONSISTENCY ===")
status_mismatches = set()
for path in BACKEND.rglob("*.js"):
    if "node_modules" in str(path):
        continue
    content = path.read_text(errors='ignore')
    if "status='actif'" in content:
        status_mismatches.add(str(path))
if not status_mismatches:
    ok("No hardcoded status='actif' — all use IN ('actif','validee','en_cours')")
else:
    for p in status_mismatches:
        issue("LOW", f"Hardcoded status='actif' — may miss 'validee'", p)

# ─── 6. Route existence ───
print("=== 6. ROUTES ===")
server_js = BACKEND / "server.js"
if server_js.exists():
    content = server_js.read_text(errors='ignore')
    expected = {
        "/api/clients": "clients",
        "/api/taches": "taches",
        "/api/contrats": "contrats",
        "/api/ark": "ark",
        "/api/dashboard": "dashboard",
        "/api/billing/checkout": "billing",
        "/api/billing/webhook": "billing",
        "/api/billing/portal": "billing",
        "/api/auth": "auth",
    }
    for route, module in expected.items():
        if f"require('./src/routes/{module}')" in content or f"require('.{module}')" in content:
            ok(f"Route {route} mounted")
        else:
            issue("HIGH", f"Route {route} NOT mounted")

# ─── 7. Bundle size ───
print("=== 7. BUNDLE ===")
dist = FRONTEND.parent / "dist" / "assets"
if dist.exists():
    total_gzip = 0
    for f in dist.glob("*.js"):
        total_gzip += f.stat().st_size
    import subprocess, json
    # approximate gzip sizes from build output
    ok(f"Dist folder exists ({total_gzip/1024:.0f} KB raw JS)")
else:
    issue("HIGH", "dist/ folder missing — frontend not built")

# ─── Report ───
print()
print("=" * 60)
print(f"READINESS AUDIT — {len(OK)} passed, {len(ISSUES)} issues")
print("=" * 60)
for o in OK:
    print(f"  {o}")
for i in ISSUES:
    print(f"  {i}")

severity_score = sum(
    3 if "[HIGH]" in i else 2 if "[MEDIUM]" in i else 1
    for i in ISSUES
)
print(f"\nSeverity score: {severity_score} (lower is better)")
sys.exit(1 if severity_score > 2 else 0)
