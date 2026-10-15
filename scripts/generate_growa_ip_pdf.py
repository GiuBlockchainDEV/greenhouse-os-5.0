#!/usr/bin/env python3
"""
Generate the Growa IP Protection Document PDF.

Premium corporate design: off-white #F6F6F2, near-black #191815,
Growa green #35A853, white modular cards, black-box architecture.

Security: reads only docs/ip-vault/growa/*.md — no credentials.
Output: docs/ip-vault/growa/Growa-IP-Protection.pdf
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import markdown
from markdown.extensions.fenced_code import FencedCodeExtension
from markdown.extensions.tables import TableExtension
from weasyprint import HTML

ROOT = Path(__file__).resolve().parent.parent
GROWA_DIR = ROOT / "docs" / "ip-vault" / "growa"
ASSETS_DIR = GROWA_DIR / "assets"
OUTPUT_PDF = GROWA_DIR / "Growa-IP-Protection.pdf"
OUTPUT_HTML = GROWA_DIR / "_compiled.html"

NOTE_ORDER = [
    "00-Cover.md",
    "Home.md",
    "01-Platform-Value.md",
    "02-Black-Box-Architecture.md",
    "03-Agronomic-Intelligence.md",
    "04-Climate-Twin.md",
    "05-Virtual-Experience.md",
    "06-GAIA-Intelligence.md",
    "07-Data-Governance.md",
    "08-Industrial-Bridge.md",
    "09-Interface-Contracts.md",
    "10-Trade-Secret-Policy.md",
    "11-Capability-Registry.md",
    "12-IP-Declaration.md",
]

WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
HTML_TAG_RE = re.compile(r"<div class=\"card-grid\">(.*?)</div>", re.DOTALL)


def resolve_wikilinks(text: str) -> str:
    def replacer(match: re.Match[str]) -> str:
        display = match.group(2) or match.group(1)
        return f'<span class="wikilink">{display}</span>'

    return WIKILINK_RE.sub(replacer, text)


def highlight_interface_code(html: str) -> str:
    """Add subtle syntax coloring to TypeScript interface blocks."""
    html = html.replace("// mm/day", '<span class="comment">// mm/day</span>')
    html = html.replace("/** ", '<span class="comment">/** </span>')
    html = html.replace("interface ", '<span class="keyword">interface </span>')
    html = html.replace(": Promise", ': <span class="type">Promise</span>')
    return html


def md_to_html(md_text: str) -> str:
    md_text = resolve_wikilinks(md_text)
    html = markdown.markdown(
        md_text,
        extensions=[TableExtension(), FencedCodeExtension()],
    )
    return highlight_interface_code(html)


def wrap_cards(html: str) -> str:
    """Convert card-grid divs into styled card modules."""

    def card_replacer(match: re.Match[str]) -> str:
        inner = match.group(1)
        parts = re.split(r"<h3>", inner)
        cards = []
        for part in parts:
            part = part.strip()
            if not part:
                continue
            if not part.startswith("<h3>"):
                part = "<h3>" + part
            cards.append(f'<div class="card">{part}</div>')
        return '<div class="card-grid">' + "".join(cards) + "</div>"

    return HTML_TAG_RE.sub(card_replacer, html)


def build_cover_html() -> str:
    return """
    <div class="cover-page">
      <div>
        <p class="cover-brand">Growa</p>
        <div class="cover-accent-bar"></div>
        <h1 class="cover-title">Intellectual Property<br>Protection Document</h1>
        <p class="cover-subtitle">GreenhouseOS 5.0 — Enterprise Virtual Twin Platform</p>
      </div>
      <div class="cover-meta">
        <table>
          <tr><td>Prepared by</td><td>Growa</td></tr>
          <tr><td>Document type</td><td>Technical IP Reference</td></tr>
          <tr><td>Version</td><td>5.0.0</td></tr>
          <tr><td>Date</td><td>September 2026</td></tr>
          <tr><td>Approach</td><td>Black-box architecture</td></tr>
        </table>
      </div>
      <p class="cover-footer">Confidential — Trade secrets protected</p>
    </div>
    """


def build_note_section(filename: str, html_body: str) -> str:
    slug = filename.replace(".md", "")
    is_home = slug == "Home"
    label = "Overview" if is_home else slug.split("-", 1)[-1].replace("-", " ").title()

    if filename == "00-Cover.md":
        return ""  # Cover rendered separately

    return f"""
    <section class="note-section" id="{slug}">
      <span class="section-label">{label}</span>
      {wrap_cards(html_body)}
    </section>
    """


def build_html() -> str:
    css_path = ASSETS_DIR / "growa-theme.css"
    css = css_path.read_text(encoding="utf-8")

    sections: list[str] = [build_cover_html()]

    for filename in NOTE_ORDER:
        if filename == "00-Cover.md":
            continue
        path = GROWA_DIR / filename
        if not path.exists():
            print(f"Warning: missing {filename}", file=sys.stderr)
            continue
        raw = path.read_text(encoding="utf-8")
        html_body = md_to_html(raw)
        sections.append(build_note_section(filename, html_body))

    body = "\n".join(sections)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Growa — IP Protection Document</title>
<style>{css}</style>
</head>
<body>
{body}
</body>
</html>"""


def main() -> None:
    print("Compiling Growa IP vault → HTML …")
    html = build_html()
    OUTPUT_HTML.write_text(html, encoding="utf-8")
    print(f"  HTML: {OUTPUT_HTML}")

    print("Rendering PDF via WeasyPrint …")
    HTML(string=html, base_url=str(GROWA_DIR)).write_pdf(str(OUTPUT_PDF))

    size_kb = OUTPUT_PDF.stat().st_size / 1024
    print(f"  PDF:  {OUTPUT_PDF} ({size_kb:.0f} KB)")

    OUTPUT_HTML.unlink(missing_ok=True)
    print("Done.")


if __name__ == "__main__":
    main()
