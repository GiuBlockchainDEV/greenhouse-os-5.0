#!/usr/bin/env python3
"""
Generate a single PDF from the GreenhouseOS IP Knowledge Vault (Obsidian-style).

Security: reads only docs/ip-vault/*.md — no .env, no credentials.
Output: docs/ip-vault/GreenhouseOS-5.0-IP-Vault.pdf
"""

from __future__ import annotations

import re
import sys
import textwrap
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent.parent
VAULT_DIR = ROOT / "docs" / "ip-vault"
OUTPUT_PDF = VAULT_DIR / "GreenhouseOS-5.0-IP-Vault.pdf"
OUTPUT_MD = VAULT_DIR / "_compiled.md"

NOTE_ORDER = [
    "00-IP-Deposit-Cover.md",
    "Home.md",
    "01-Executive-Summary.md",
    "02-System-Overview.md",
    "03-Physics-Engine.md",
    "04-Thermal-Simulation.md",
    "05-3D-Frontend.md",
    "06-AI-Gateway.md",
    "07-Data-Persistence.md",
    "08-Industrial-Export.md",
    "09-API-Contracts.md",
    "10-Security-Redaction-Policy.md",
    "11-Module-Index.md",
    "12-IP-Declaration.md",
]

WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
CODE_BLOCK_RE = re.compile(r"```[\w]*\n(.*?)```", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
ITALIC_RE = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)")
LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
HR_RE = re.compile(r"^---+\s*$")
TABLE_SEP_RE = re.compile(r"^\|[-| :]+\|\s*$")


def strip_wikilinks(text: str) -> str:
    def replacer(match: re.Match[str]) -> str:
        return match.group(2) or match.group(1)

    return WIKILINK_RE.sub(replacer, text)


def clean_inline(text: str) -> str:
    text = strip_wikilinks(text)
    text = LINK_RE.sub(r"\1", text)
    text = INLINE_CODE_RE.sub(r"\1", text)
    text = BOLD_RE.sub(r"\1", text)
    text = ITALIC_RE.sub(r"\1", text)
    return text.strip()


def build_combined_markdown() -> str:
    parts: list[str] = []
    for filename in NOTE_ORDER:
        path = VAULT_DIR / filename
        if not path.exists():
            print(f"Warning: missing {filename}", file=sys.stderr)
            continue
        parts.append(path.read_text(encoding="utf-8"))
        parts.append("\n\n\\newpage\n\n")
    return "".join(parts)


class VaultPDF(FPDF):
    def __init__(self) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=18)
        self._register_fonts()

    def _register_fonts(self) -> None:
        self.add_font("DejaVu", "", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        self.add_font("DejaVu", "B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
        self.add_font("DejaVu", "I", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        self.add_font("Mono", "", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")

    def header(self) -> None:
        if self.page_no() <= 1:
            return
        self.set_font("DejaVu", "I", 7)
        self.set_text_color(120, 140, 130)
        self.cell(0, 5, "GreenhouseOS 5.0 — IP Knowledge Vault", align="L")
        self.ln(3)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("DejaVu", "I", 7)
        self.set_text_color(120, 140, 130)
        self.cell(0, 5, f"Page {self.page_no()}", align="C")

    def write_heading(self, level: int, text: str) -> None:
        sizes = {1: 16, 2: 13, 3: 11, 4: 10}
        self.ln(4 if level > 1 else 2)
        self.set_font("DejaVu", "B", sizes.get(level, 10))
        green = (13, 79, 60) if level == 1 else (26 + level * 10, 90, 71)
        self.set_text_color(*green)
        self.multi_cell(0, sizes.get(level, 10) * 0.55, clean_inline(text))
        self.set_text_color(26, 26, 46)
        self.ln(2)

    def write_paragraph(self, text: str) -> None:
        if not text.strip():
            return
        self.set_font("DejaVu", "", 9)
        self.multi_cell(0, 4.5, clean_inline(text))
        self.ln(1)

    def write_codeblock(self, code: str) -> None:
        self.set_font("Mono", "", 7)
        self.set_fill_color(240, 244, 242)
        for line in code.rstrip().split("\n"):
            safe = line.replace("\t", "    ")
            self.cell(0, 3.8, "  " + safe, fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def write_table(self, rows: list[list[str]]) -> None:
        if not rows:
            return
        col_count = max(len(r) for r in rows)
        usable = self.w - self.l_margin - self.r_margin
        col_w = usable / col_count
        self.set_font("DejaVu", "", 7.5)
        for i, row in enumerate(rows):
            if i == 0:
                self.set_font("DejaVu", "B", 7.5)
                self.set_fill_color(232, 245, 238)
            else:
                self.set_font("DejaVu", "", 7.5)
                self.set_fill_color(245, 250, 247 if i % 2 == 0 else 255)
            for cell in row:
                self.cell(col_w, 5, clean_inline(cell)[:60], border=1, fill=True)
            self.ln()
        self.ln(2)

    def write_bullet(self, text: str, ordered: bool = False) -> None:
        self.set_font("DejaVu", "", 9)
        prefix = "- " if not ordered else "  "
        self.multi_cell(0, 4.5, prefix + clean_inline(text))
        self.ln(0.5)

    def write_blockquote(self, text: str) -> None:
        self.set_font("DejaVu", "I", 9)
        self.set_text_color(58, 90, 74)
        x = self.l_margin + 4
        self.set_x(x)
        self.multi_cell(self.w - x - self.r_margin, 4.5, clean_inline(text))
        self.set_text_color(26, 26, 46)
        self.ln(2)


def parse_table_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def render_markdown(pdf: VaultPDF, md_text: str) -> None:
    lines = md_text.split("\n")
    i = 0
    in_code = False
    code_buf: list[str] = []
    table_rows: list[list[str]] = []

    while i < len(lines):
        line = lines[i]

        if line.strip().startswith("```"):
            if in_code:
                pdf.write_codeblock("\n".join(code_buf))
                code_buf = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        if line.strip() == "\\newpage":
            pdf.add_page()
            i += 1
            continue

        if HR_RE.match(line):
            pdf.ln(3)
            i += 1
            continue

        if line.strip().startswith("|"):
            if TABLE_SEP_RE.match(line):
                i += 1
                continue
            table_rows.append(parse_table_row(line))
            if i + 1 >= len(lines) or not lines[i + 1].strip().startswith("|"):
                pdf.write_table(table_rows)
                table_rows = []
            i += 1
            continue

        if line.startswith("#"):
            level = len(line) - len(line.lstrip("#"))
            text = line.lstrip("#").strip()
            if level == 1 and pdf.page_no() > 0:
                pdf.add_page()
            pdf.write_heading(level, text)
            i += 1
            continue

        if line.startswith("> "):
            pdf.write_blockquote(line[2:])
            i += 1
            continue

        if line.strip().startswith("- ") or line.strip().startswith("* "):
            pdf.write_bullet(line.strip()[2:])
            i += 1
            continue

        m = re.match(r"^(\d+)\.\s+(.+)", line.strip())
        if m:
            pdf.write_bullet(m.group(2), ordered=True)
            i += 1
            continue

        if line.strip():
            pdf.write_paragraph(line)
        i += 1


def main() -> None:
    print("Combining vault notes …")
    combined = build_combined_markdown()
    OUTPUT_MD.write_text(combined, encoding="utf-8")
    print(f"  Markdown: {OUTPUT_MD} ({len(combined)} chars)")

    print("Rendering PDF …")
    pdf = VaultPDF()
    pdf.set_margins(18, 18, 18)
    pdf.add_page()
    render_markdown(pdf, combined)
    pdf.output(str(OUTPUT_PDF))

    size_kb = OUTPUT_PDF.stat().st_size / 1024
    print(f"  PDF: {OUTPUT_PDF} ({size_kb:.0f} KB, {pdf.page_no()} pages)")

    OUTPUT_MD.unlink(missing_ok=True)
    print("Done.")


if __name__ == "__main__":
    main()
