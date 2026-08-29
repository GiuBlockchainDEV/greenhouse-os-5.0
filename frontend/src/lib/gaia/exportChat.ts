/** Download GAIA conversation as PDF. */
import { jsPDF } from "jspdf";
import { marked } from "marked";

import type { CopilotMessage } from "@/types/ai";

export interface GaiaExportLabels {
  title: string;
  userHeading: string;
  assistantHeading: string;
  exportedAtLabel: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExportHtml(messages: CopilotMessage[], labels: GaiaExportLabels): string {
  const exportedAt = new Date().toLocaleString();

  const sections = messages
    .map((msg) => {
      const heading = msg.role === "user" ? labels.userHeading : labels.assistantHeading;
      const body =
        msg.role === "assistant"
          ? marked.parse(msg.content, { async: false })
          : `<p>${escapeHtml(msg.content).replace(/\n/g, "<br/>")}</p>`;

      return `
        <section style="margin-bottom: 20px; page-break-inside: avoid;">
          <h2 style="font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">
            ${escapeHtml(heading)}
          </h2>
          <div style="font-size: 11px; line-height: 1.55; color: #374151;">${body}</div>
        </section>`;
    })
    .join("");

  return `
    <div class="gaia-export" style="font-family: Inter, system-ui, sans-serif; color: #111827;">
      <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 4px;">GAIA — ${escapeHtml(labels.title)}</h1>
      <p style="font-size: 10px; color: #6b7280; margin: 0 0 20px;">${escapeHtml(labels.exportedAtLabel)}: ${escapeHtml(exportedAt)}</p>
      ${sections}
    </div>`;
}

export async function exportGaiaChat(
  messages: CopilotMessage[],
  labels: GaiaExportLabels,
): Promise<void> {
  if (messages.length === 0) return;

  const container = document.createElement("div");
  container.style.cssText =
    "position: fixed; left: -9999px; top: 0; width: 680px; padding: 24px; background: #fff;";
  container.innerHTML = buildExportHtml(messages, labels);
  document.body.appendChild(container);

  try {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const filename = `${labels.title.replace(/\s+/g, "_").toLowerCase()}_gaia_${new Date().toISOString().slice(0, 10)}.pdf`;

    await doc.html(container, {
      x: 24,
      y: 24,
      width: 547,
      windowWidth: 680,
      autoPaging: "text",
      html2canvas: { scale: 0.72, useCORS: true },
    });

    doc.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
