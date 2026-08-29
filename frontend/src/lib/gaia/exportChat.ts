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

const PAGE_MARGIN = 48;
const LINE_HEIGHT = 14;
const SECTION_GAP = 16;

function markdownToPlainText(markdown: string): string {
  const html = marked.parse(markdown, { async: false }) as string;
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent ?? el.innerText ?? markdown).replace(/\n{3,}/g, "\n\n").trim();
}

export async function exportGaiaChat(
  messages: CopilotMessage[],
  labels: GaiaExportLabels,
): Promise<void> {
  if (messages.length === 0) return;

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`GAIA — ${labels.title}`, PAGE_MARGIN, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`${labels.exportedAtLabel}: ${new Date().toLocaleString()}`, PAGE_MARGIN, y);
  y += SECTION_GAP;
  doc.setTextColor(17, 24, 39);

  for (const msg of messages) {
    const heading = msg.role === "user" ? labels.userHeading : labels.assistantHeading;
    const body = msg.role === "assistant" ? markdownToPlainText(msg.content) : msg.content.trim();

    ensureSpace(LINE_HEIGHT + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(heading, PAGE_MARGIN, y);
    y += LINE_HEIGHT + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(body, maxWidth);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, PAGE_MARGIN, y);
      y += LINE_HEIGHT;
    }
    y += SECTION_GAP;
  }

  const filename = `${labels.title.replace(/\s+/g, "_").toLowerCase()}_gaia_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
