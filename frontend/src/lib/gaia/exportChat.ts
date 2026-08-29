/** Download GAIA conversation as Markdown. */
import type { CopilotMessage } from "@/types/ai";

export function exportGaiaChat(messages: CopilotMessage[], title = "gaia-analysis"): void {
  if (messages.length === 0) return;

  const body = messages
    .map((msg) => {
      const heading = msg.role === "user" ? "### Richiesta" : "### GAIA";
      return `${heading}\n\n${msg.content.trim()}\n`;
    })
    .join("\n---\n\n");

  const exportedAt = new Date().toISOString();
  const markdown = `# GAIA — ${title}\n\n_Esportato: ${exportedAt}_\n\n${body}`;

  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.replace(/\s+/g, "_").toLowerCase()}_${exportedAt.slice(0, 10)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
