#!/usr/bin/env python3
"""Audit QA statique COURTIA.

Ce script ne remplace pas les tests navigateur. Il sert de filet de contrôle
pour repérer les régressions visibles : ancien logo, routes legacy, messages
techniques, loaders génériques, docs manquantes et endpoints Admin suspects.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
SRC = FRONTEND / "src"
DOCS = ROOT / "docs"

APP = SRC / "App.jsx"

SCAN_SUFFIXES = {".js", ".jsx", ".ts", ".tsx", ".css"}
SCAN_DIRS = [SRC / "pages", SRC / "components", SRC / "stores", SRC / "api"]

REQUIRED_DOCS = [
    "COURTIA_CHANGELOG.md",
    "COURTIA_QA_REPORT.md",
    "COURTIA_REMAINING_TASKS.md",
    "COURTIA_AURORA_DESIGN_SYSTEM.md",
    "COURTIA_ADMIN_CENTER.md",
    "COURTIA_CODEX_PHASE5_ADMIN.md",
]

REQUIRED_AURORA_COMPONENTS = [
    "CourtiaBubbleLogo.jsx",
    "CourtiaMiniLogo.jsx",
    "CourtiaLogoLoader.jsx",
    "AuroraButton.jsx",
    "AuroraCard.jsx",
    "AuroraBadge.jsx",
    "AuroraDivider.jsx",
    "AuroraPageHeader.jsx",
    "AuroraEmptyState.jsx",
]

REQUIRED_PAGES = [
    "LandingPublic.jsx",
    "LoginPage.jsx",
    "Dashboard.jsx",
    "Clients.jsx",
    "ClientDetail.jsx",
    "Contrats.jsx",
    "Taches.jsx",
    "Rapports.jsx",
    "Parametres.jsx",
    "AdminOverview.jsx",
]

TECHNICAL_PATTERNS = [
    r"err\.message",
    r"error\.message",
    r"duplicate key",
    r"constraint",
    r"\bSQL\b",
    r"PostgreSQL",
    r"Internal Server Error",
]

GENERIC_LOADER_PATTERNS = [
    r">\s*Loading(?:\.\.\.)?\s*<",
    r"['\"]Loading(?:\.\.\.)?['\"]",
    r">\s*Chargement\.\.\.\s*<",
    r"['\"]Chargement\.\.\.['\"]",
    r"\banimate-spin\b",
]

ADMIN_SUSPECT_ENDPOINTS = [
    "/api/admin/analytics",
    "/api/admin/users",
    "/api/admin/impersonation/logs",
]

ALLOWED_INTERNAL_PREFIXES = (
    "/api/",
    "/assets/",
    "/landing/",
    "/upload/",
)


@dataclass
class Hit:
    level: str
    category: str
    path: str
    line: int
    detail: str


def iter_files() -> list[Path]:
    files: list[Path] = []
    for directory in SCAN_DIRS:
        if not directory.exists():
            continue
        for path in directory.rglob("*"):
            if path.is_file() and path.suffix in SCAN_SUFFIXES:
                files.append(path)
    files.append(APP)
    return sorted(set(files))


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def line_number(text: str, offset: int) -> int:
    return text[:offset].count("\n") + 1


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def add_regex_hits(hits: list[Hit], path: Path, text: str, pattern: str, level: str, category: str, detail: str) -> None:
    for match in re.finditer(pattern, text, re.IGNORECASE):
        hits.append(Hit(level, category, rel(path), line_number(text, match.start()), detail))


def extract_routes() -> set[str]:
    if not APP.exists():
        return set()
    source = read(APP)
    return set(re.findall(r'<Route\s+path="([^"]+)"', source))


def is_known_route(value: str, routes: set[str]) -> bool:
    if not value.startswith("/") or value.startswith(ALLOWED_INTERNAL_PREFIXES):
        return True
    if "${" in value or ":" in value:
        return True
    clean = value.split("?", 1)[0].split("#", 1)[0]
    if clean in {"/", ""}:
        return True
    if clean in routes:
        return True
    return False


def audit() -> tuple[list[Hit], dict[str, object]]:
    hits: list[Hit] = []
    files = iter_files()
    routes = extract_routes()

    for path in files:
        text = read(path)

        add_regex_hits(hits, path, text, r">\s*C\s*<", "P1", "Ancien logo", "Ancien logo texte `C` détecté")
        add_regex_hits(hits, path, text, r"/app/[a-zA-Z0-9/_-]+", "P1", "Route legacy", "Référence `/app/*` détectée")

        for pattern in TECHNICAL_PATTERNS:
            add_regex_hits(hits, path, text, pattern, "P2", "Message technique", f"Motif technique détecté : `{pattern}`")

        for pattern in GENERIC_LOADER_PATTERNS:
            add_regex_hits(hits, path, text, pattern, "P2", "Loader générique", f"Motif loader générique : `{pattern}`")

        if "Admin" in path.name or path.name == "AdminRoute.jsx" or path.name == "adminApi.js":
            for endpoint in ADMIN_SUSPECT_ENDPOINTS:
                if endpoint in text:
                    hits.append(Hit("P1", "Endpoint Admin suspect", rel(path), 1, f"Ancien endpoint détecté : `{endpoint}`"))

        for match in re.finditer(r'(?:href|to)=\{?["\']([^"\'}]+)["\']', text):
            value = match.group(1)
            if value.startswith("/") and not is_known_route(value, routes):
                hits.append(Hit("P2", "Lien interne", rel(path), line_number(text, match.start()), f"Route React non confirmée : `{value}`"))

    docs_status = {doc: (DOCS / doc).exists() for doc in REQUIRED_DOCS}
    for doc, exists in docs_status.items():
        if not exists:
            hits.append(Hit("P1", "Documentation", f"docs/{doc}", 0, "Document requis manquant"))

    aurora_dir = SRC / "components" / "brand"
    aurora_status = {component: (aurora_dir / component).exists() for component in REQUIRED_AURORA_COMPONENTS}
    for component, exists in aurora_status.items():
        if not exists:
            hits.append(Hit("P1", "Aurora", f"frontend/src/components/brand/{component}", 0, "Composant Aurora requis manquant"))

    pages_dir = SRC / "pages"
    pages_status = {page: (pages_dir / page).exists() for page in REQUIRED_PAGES}
    for page, exists in pages_status.items():
        if not exists:
            hits.append(Hit("P1", "Page", f"frontend/src/pages/{page}", 0, "Page attendue manquante"))

    meta = {
        "files_scanned": len(files),
        "routes": sorted(routes),
        "docs_status": docs_status,
        "aurora_status": aurora_status,
        "pages_status": pages_status,
    }
    return hits, meta


def write_report(hits: list[Hit], meta: dict[str, object]) -> Path:
    DOCS.mkdir(parents=True, exist_ok=True)
    report_path = DOCS / "COURTIA_CODEX_QA_AUDIT.md"
    unique: dict[tuple[str, str, str, int, str], Hit] = {
        (hit.level, hit.category, hit.path, hit.line, hit.detail): hit
        for hit in hits
    }
    hits = list(unique.values())
    p1_hits = [hit for hit in hits if hit.level in {"P0", "P1"}]
    status = "OK" if not p1_hits else "A SURVEILLER"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines: list[str] = [
        "# COURTIA — Audit QA Python",
        "",
        f"- Date : {now}",
        f"- Statut : {status}",
        f"- Fichiers scannés : {meta['files_scanned']}",
        "",
        "## Synthèse",
        "",
        f"- P0/P1 : {len(p1_hits)}",
        f"- P2 : {len([hit for hit in hits if hit.level == 'P2'])}",
        "",
        "## Documentation",
        "",
        "| Document | Statut |",
        "|---|---|",
    ]

    docs_status = meta["docs_status"]
    for doc, exists in docs_status.items():
        lines.append(f"| `{doc}` | {'OK' if exists else 'Manquant'} |")

    lines += [
        "",
        "## Composants Aurora",
        "",
        "| Composant | Statut |",
        "|---|---|",
    ]
    for component, exists in meta["aurora_status"].items():
        lines.append(f"| `{component}` | {'OK' if exists else 'Manquant'} |")

    lines += [
        "",
        "## Pages attendues",
        "",
        "| Page | Statut |",
        "|---|---|",
    ]
    for page, exists in meta["pages_status"].items():
        lines.append(f"| `{page}` | {'OK' if exists else 'Manquant'} |")

    lines += [
        "",
        "## Routes React détectées",
        "",
        ", ".join(f"`{route}`" for route in meta["routes"]),
        "",
        "## Résultats détaillés",
        "",
    ]

    if hits:
        lines += [
            "| Niveau | Catégorie | Fichier | Ligne | Détail |",
            "|---|---|---|---:|---|",
        ]
        for hit in hits:
            lines.append(f"| {hit.level} | {hit.category} | `{hit.path}` | {hit.line or '-'} | {hit.detail} |")
    else:
        lines.append("- Aucun signal problématique détecté par l'audit statique.")

    lines += [
        "",
        "## Limites",
        "",
        "- L'audit statique ne remplace pas `npm run build`, `npm run test` ni la QA navigateur.",
        "- Les P2 signalent des points à revoir manuellement, pas forcément des bugs bloquants.",
    ]

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return report_path


def main() -> int:
    hits, meta = audit()
    report_path = write_report(hits, meta)
    p1_count = len([hit for hit in hits if hit.level in {"P0", "P1"}])
    p2_count = len([hit for hit in hits if hit.level == "P2"])
    print(f"Courtia QA audit: {p1_count} P0/P1, {p2_count} P2")
    print(f"Report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
