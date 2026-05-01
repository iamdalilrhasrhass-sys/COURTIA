#!/usr/bin/env python3
"""Audit statique de la landing COURTIA Phase 2.

Le script ne remplace pas les tests navigateur. Il vérifie les points produit
facilement objectivables : sections attendues, anciens logos, CTA et routes.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
DOCS = ROOT / "docs"

LANDING = FRONTEND / "src/pages/LandingPublic.jsx"
APP = FRONTEND / "src/App.jsx"
MOCKUPS = [
    FRONTEND / "src/components/FloatingProductMockup.jsx",
    FRONTEND / "src/components/DashboardMockup.jsx",
]

REQUIRED_SECTIONS = [
    ("hero", "Le cockpit IA des courtiers qui veulent reprendre le controle"),
    ("credibilite", "CRM metier courtage"),
    ("probleme", "Les courtiers ne manquent pas de clients"),
    ("cout-invisible", "pertes invisibles"),
    ("solution", "COURTIA transforme votre portefeuille en cockpit d'actions"),
    ("ark", "ARK ne remplace pas le courtier"),
    ("workflow", "Une journee plus claire"),
    ("cockpit", "Apercu produit"),
    ("fonctionnalites", "CRM clients"),
    ("avant-apres", "Avant COURTIA"),
    ("crm-metier", "CRM generaliste"),
    ("pricing", "159 EUR HT/mois"),
    ("reassurance", "courtiers francais"),
    ("faq", "COURTIA remplace-t-il"),
    ("cta-final", "Reprenez le controle de votre portefeuille"),
]

REQUIRED_BILLING_MARKERS = [
    "0 EUR aujourd'hui",
    "carte pour activer",
    "Annulation possible en ligne",
    "159 EUR HT/mois",
]

PUBLIC_ALLOWED_LINK_PREFIXES = (
    "/",
    "#",
    "mailto:",
)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def normalize(text: str) -> str:
    replacements = {
        "é": "e",
        "è": "e",
        "ê": "e",
        "ë": "e",
        "à": "a",
        "â": "a",
        "î": "i",
        "ï": "i",
        "ô": "o",
        "ù": "u",
        "û": "u",
        "ç": "c",
        "É": "E",
        "È": "E",
        "À": "A",
        "Ç": "C",
        "€": "EUR",
        "’": "'",
        "“": '"',
        "”": '"',
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return re.sub(r"\s+", " ", text)


def extract_app_routes(app_source: str) -> set[str]:
    return set(re.findall(r'<Route\s+path="([^"]+)"', app_source))


def route_exists(href: str, routes: set[str]) -> bool:
    if href.startswith("#") or href.startswith("mailto:"):
        return True
    clean = href.split("?", 1)[0].split("#", 1)[0]
    if clean == "/":
        return True
    if clean in routes:
        return True
    # Routes dynamiques : /upload/:token ne doit pas valider /upload seul.
    return False


@dataclass
class Finding:
    level: str
    item: str
    detail: str


def main() -> int:
    landing = read(LANDING)
    app_source = read(APP)
    normalized = normalize(landing)
    routes = extract_app_routes(app_source)
    findings: list[Finding] = []

    section_results = []
    for section_id, marker in REQUIRED_SECTIONS:
        present = f'id="{section_id}"' in landing or normalize(marker) in normalized
        section_results.append((section_id, marker, present))
        if not present:
            findings.append(Finding("P1", f"Section {section_id}", f"Marqueur absent : {marker}"))

    old_logo_hits = []
    for path in MOCKUPS:
        source = read(path)
        for match in re.finditer(r">\s*C\s*<", source):
            line = source[: match.start()].count("\n") + 1
            old_logo_hits.append((path.relative_to(ROOT), line))
            findings.append(Finding("P1", "Ancien logo", f"{path.relative_to(ROOT)}:{line} contient encore un C texte"))

    hrefs = sorted(set(re.findall(r'(?:href|to)=\{?["\']([^"\'}]+)["\']', landing)))
    route_literals = sorted(set(re.findall(r'["\'](/[^"\'\s{}]+)["\']', landing)))
    hrefs = sorted(set(hrefs + [route for route in route_literals if route.startswith(("/", "#", "mailto:"))]))
    broken_links = []
    for href in hrefs:
        if not href.startswith(PUBLIC_ALLOWED_LINK_PREFIXES):
            continue
        if not route_exists(href, routes):
            broken_links.append(href)
            findings.append(Finding("P1", "CTA / lien", f"Lien public sans route React : {href}"))

    legacy_route_hits = sorted(set(re.findall(r"/app/[a-zA-Z0-9/_-]+", landing)))
    for route in legacy_route_hits:
        findings.append(Finding("P1", "Route legacy", f"Reference /app/* detectee : {route}"))

    required_cta = ["/register", "/register?plan=pro", "/login"]
    cta_results = [(cta, cta in landing) for cta in required_cta]
    for cta, present in cta_results:
        if not present:
            findings.append(Finding("P2", "CTA attendu", f"CTA absent : {cta}"))

    billing_results = []
    for marker in REQUIRED_BILLING_MARKERS:
        present = normalize(marker) in normalized
        billing_results.append((marker, present))
        if not present:
            findings.append(Finding("P1", "Discours essai Pro", f"Marqueur absent : {marker}"))

    report_path = DOCS / "COURTIA_CODEX_LANDING_AUDIT.md"
    DOCS.mkdir(parents=True, exist_ok=True)
    status = "OK" if not findings else "A CORRIGER"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = [
        "# COURTIA — Audit Landing Phase 2",
        "",
        f"- Date : {now}",
        f"- Statut : {status}",
        f"- Fichier landing : `{LANDING.relative_to(ROOT)}`",
        "",
        "## Sections attendues",
        "",
        "| Section | Marqueur | Statut |",
        "|---|---|---|",
    ]
    for section_id, marker, present in section_results:
        lines.append(f"| `{section_id}` | {marker} | {'OK' if present else 'Absent'} |")

    lines += [
        "",
        "## Anciens logos",
        "",
    ]
    if old_logo_hits:
        for path, line in old_logo_hits:
            lines.append(f"- A corriger : `{path}:{line}`")
    else:
        lines.append("- Aucun ancien `C` texte detecte dans les mockups cibles.")

    lines += [
        "",
        "## CTA et routes",
        "",
        "| Lien | Route valide |",
        "|---|---|",
    ]
    for href in hrefs:
        if href.startswith(PUBLIC_ALLOWED_LINK_PREFIXES):
            lines.append(f"| `{href}` | {'OK' if route_exists(href, routes) else 'A corriger'} |")

    lines += [
        "",
        "## CTA obligatoires",
        "",
        "| CTA | Statut |",
        "|---|---|",
    ]
    for cta, present in cta_results:
        lines.append(f"| `{cta}` | {'OK' if present else 'Absent'} |")

    lines += [
        "",
        "## Discours essai Pro",
        "",
        "| Marqueur | Statut |",
        "|---|---|",
    ]
    for marker, present in billing_results:
        lines.append(f"| {marker} | {'OK' if present else 'Absent'} |")

    lines += [
        "",
        "## Routes referencees",
        "",
        f"- Routes React detectees : {', '.join(sorted(routes))}",
        f"- References legacy `/app/*` dans la landing : {', '.join(legacy_route_hits) if legacy_route_hits else 'aucune'}",
        "",
        "## Problemes",
        "",
    ]
    if findings:
        lines += [f"- {f.level} — {f.item} : {f.detail}" for f in findings]
    else:
        lines.append("- Aucun probleme statique bloquant detecte par ce script.")

    lines += [
        "",
        "## Limites",
        "",
        "- Ce rapport ne remplace pas le build Vite, les tests React ni la verification navigateur desktop/mobile.",
    ]

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Landing audit: {status}")
    print(f"Report: {report_path}")
    return 0 if not findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
