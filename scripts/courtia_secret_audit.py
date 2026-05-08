#!/usr/bin/env python3
"""
COURTIA secret audit (non-destructive).

- Scanne le repo pour motifs sensibles.
- Ignore node_modules/dist et fichiers image.
- N'affiche jamais les valeurs complètes.
- Génère un rapport markdown synthétique.
"""

from __future__ import annotations

import re
import os
from datetime import date
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = REPO_ROOT / "docs" / "COURTIA_SECRET_AUDIT_REPORT.md"

EXCLUDED_DIR_NAMES = {
    "node_modules",
    "dist",
    ".git",
    ".vercel",
    "build",
    "__pycache__",
}

EXCLUDED_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".pdf",
    ".zip",
    ".mp4",
}

TEXT_SUFFIXES = {
    "",
    ".md",
    ".txt",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".yml",
    ".yaml",
    ".toml",
    ".sh",
    ".zsh",
    ".py",
    ".sql",
    ".env",
}

MAX_FILE_BYTES = 1_500_000


@dataclass
class SecretPattern:
    name: str
    regex: re.Pattern[str]
    severity: str  # P0 / P1 / P2
    recommendation: str


PATTERNS: List[SecretPattern] = [
    SecretPattern(
        "Stripe Live Key",
        re.compile(r"\bsk_live_[A-Za-z0-9]+\b"),
        "P0",
        "Révoquer immédiatement et régénérer dans Stripe Dashboard.",
    ),
    SecretPattern(
        "Stripe Test Key",
        re.compile(r"\bsk_test_[A-Za-z0-9]+\b"),
        "P1",
        "Régénérer si exposée hors canal sécurisé.",
    ),
    SecretPattern(
        "Stripe Webhook Secret",
        re.compile(r"\bwhsec_[A-Za-z0-9]+\b"),
        "P1",
        "Créer un nouveau webhook secret et invalider l'ancien.",
    ),
    SecretPattern(
        "Anthropic API Key",
        re.compile(r"\bsk-ant-[A-Za-z0-9\-_]+\b"),
        "P1",
        "Conserver backend-only et régénérer si exposée.",
    ),
    SecretPattern(
        "JWT Secret Assignment",
        re.compile(r"JWT_SECRET\s*=\s*[^\s#]+"),
        "P1",
        "Supprimer des docs/scripts publics et utiliser env manager.",
    ),
    SecretPattern(
        "Database URL (inline)",
        re.compile(r"postgres(?:ql)?://[^\s'\"`]+"),
        "P1",
        "Masquer l'URL, régénérer credentials si exposés.",
    ),
    SecretPattern(
        "Render API Key mention",
        re.compile(r"RENDER_API_KEY\s*=?\s*[^\s#]*"),
        "P2",
        "Vérifier l'usage et révoquer les anciennes valeurs.",
    ),
    SecretPattern(
        "Private key block",
        re.compile(r"-----BEGIN (?:RSA|OPENSSH|EC|DSA) PRIVATE KEY-----"),
        "P0",
        "Retirer immédiatement du repo et révoquer la clé.",
    ),
]


def is_excluded(path: Path) -> bool:
    if any(part in EXCLUDED_DIR_NAMES for part in path.parts):
        return True
    return path.suffix.lower() in EXCLUDED_SUFFIXES


def iter_files(root: Path) -> Iterable[Path]:
    for dirpath, dirnames, filenames in os.walk(root, topdown=True, followlinks=False):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIR_NAMES]
        base = Path(dirpath)
        for name in filenames:
            p = base / name
            if is_excluded(p):
                continue
            if p.suffix.lower() not in TEXT_SUFFIXES:
                continue
            try:
                if p.stat().st_size > MAX_FILE_BYTES:
                    continue
            except OSError:
                continue
            yield p


def mask_match(s: str) -> str:
    clean = s.strip()
    if len(clean) <= 10:
        return clean[:2] + "***"
    return clean[:4] + "***" + clean[-3:]


def scan_file(path: Path) -> List[Tuple[SecretPattern, int, str]]:
    findings: List[Tuple[SecretPattern, int, str]] = []
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return findings

    for pattern in PATTERNS:
        for m in pattern.regex.finditer(content):
            line_no = content.count("\n", 0, m.start()) + 1
            snippet = mask_match(m.group(0))
            findings.append((pattern, line_no, snippet))

    return findings


def build_report(findings: Dict[str, List[Tuple[SecretPattern, int, str]]]) -> str:
    counts = {"P0": 0, "P1": 0, "P2": 0}
    for items in findings.values():
        for pattern, _, _ in items:
            counts[pattern.severity] += 1

    today = date.today().isoformat()

    lines: List[str] = []
    lines.append("# COURTIA — Secret Audit Report")
    lines.append("")
    lines.append(f"Date: {today}")
    lines.append("")
    lines.append("## Résumé")
    lines.append(f"- P0: {counts['P0']}")
    lines.append(f"- P1: {counts['P1']}")
    lines.append(f"- P2: {counts['P2']}")
    lines.append("- Valeurs masquées automatiquement (jamais affichées en clair).")
    lines.append("")

    if not findings:
        lines.append("Aucun motif sensible détecté.")
        lines.append("")
        return "\n".join(lines)

    lines.append("## Détails")
    lines.append("")
    for file_path in sorted(findings.keys()):
        rel = Path(file_path).relative_to(REPO_ROOT)
        lines.append(f"### `{rel}`")
        seen: Dict[str, int] = {}
        for pattern, line_no, masked in findings[file_path]:
            key = f"{pattern.name}:{line_no}:{masked}"
            if key in seen:
                continue
            seen[key] = 1
            lines.append(
                f"- [{pattern.severity}] {pattern.name} ligne {line_no} — `{masked}`"
            )
            lines.append(f"  - Action: {pattern.recommendation}")
        lines.append("")

    lines.append("## Recommandations immédiates")
    lines.append("- Traiter d'abord tous les P0.")
    lines.append("- Révoquer/régénérer les secrets P1 avant Stripe test mode.")
    lines.append("- Nettoyer les exemples historiques dans la documentation legacy.")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    all_findings: Dict[str, List[Tuple[SecretPattern, int, str]]] = {}
    for f in iter_files(REPO_ROOT):
        file_findings = scan_file(f)
        if file_findings:
            all_findings[str(f)] = file_findings

    report = build_report(all_findings)
    REPORT_PATH.write_text(report, encoding="utf-8")

    p0 = p1 = p2 = 0
    for items in all_findings.values():
        for pattern, _, _ in items:
            if pattern.severity == "P0":
                p0 += 1
            elif pattern.severity == "P1":
                p1 += 1
            else:
                p2 += 1

    print(f"Secret audit: P0={p0} P1={p1} P2={p2}")
    print(f"Report: {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
