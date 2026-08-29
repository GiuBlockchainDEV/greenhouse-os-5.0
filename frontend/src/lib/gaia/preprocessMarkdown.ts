/** Normalize GAIA markdown before render (sections, lists, math-friendly layout). */
export function preprocessGaiaMarkdown(content: string): string {
  let text = content.trim();

  // "1. Section Title" → heading
  text = text.replace(/^(\d+\.\s+[A-Z][^\n]+)$/gm, "## $1");

  // "Label (optional): value" metric rows → bullet with bold label
  text = text.replace(
    /^([A-Z][^\n:]{2,90}?):\s+(?=\$|\\|≈|~|\d|[A-Za-z(])/gm,
    "- **$1:** ",
  );

  // Standalone sub-label on its own line, e.g. "Daytime:"
  text = text.replace(/^([A-Z][A-Za-z\s/&-]+):\s*$/gm, "### $1");

  // Ensure blank line before headings and lists for proper block parsing
  text = text.replace(/\n(#{2,3}\s)/g, "\n\n$1");
  text = text.replace(/\n(- \*\*)/g, "\n\n$1");

  return text;
}
