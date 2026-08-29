/** Normalize GAIA markdown before render (sections, lists, math-friendly layout). */
export function preprocessGaiaMarkdown(content: string): string {
  let text = content.trim();

  // Strip spurious LaTeX around plain numbers/symbols that break layout
  text = text.replace(/\$(\d+(?:\.\d+)?)\$/g, "$1");
  text = text.replace(/\$\\approx\$/g, "≈");
  text = text.replace(/\$\\sim\$/g, "~");
  text = text.replace(/\$\s*\$/g, "");

  // "1. Section Title" → heading (skip if already markdown heading)
  text = text.replace(/^(?!#)(\d+\.\s+[A-Z][^\n]+)$/gm, "## $1");

  // "Label: value" metric rows → bullet with bold label
  text = text.replace(
    /^(?!#|-\s)([A-Z][^\n:]{2,90}?):\s+(?=[≈~\\]|\\|\d|[A-Za-z(])/gm,
    "- **$1:** ",
  );

  // Standalone sub-label on its own line, e.g. "Daytime:"
  text = text.replace(/^(?!#)([A-Z][A-Za-z\s/&-]+):\s*$/gm, "### $1");

  text = text.replace(/\n(#{2,3}\s)/g, "\n\n$1");
  text = text.replace(/\n(- \*\*)/g, "\n\n$1");

  return text;
}
