/** Download GAIA conversation as PDF. */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { marked } from "marked";

import { preprocessGaiaMarkdown } from "@/lib/gaia/preprocessMarkdown";
import type { CopilotMessage } from "@/types/ai";

export interface GaiaExportLabels {
  title: string;
  userHeading: string;
  assistantHeading: string;
  exportedAtLabel: string;
}

const EXPORT_WIDTH_PX = 794;
const PAGE_MARGIN_X_PT = 40;
const PAGE_MARGIN_Y_PT = 48;

const EXPORT_STYLES = `
  * { box-sizing: border-box; }
  .gaia-pdf-root {
    font-family: Inter, system-ui, sans-serif;
    color: #111827;
    font-size: 11px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    padding: 8px 0 24px;
  }
  .gaia-pdf-header {
    background: linear-gradient(135deg, #047857 0%, #059669 50%, #10B981 100%);
    color: #ffffff;
    padding: 22px 26px;
    border-radius: 14px;
    margin-bottom: 22px;
  }
  .gaia-pdf-header h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .gaia-pdf-header p {
    margin: 6px 0 0;
    font-size: 10px;
    opacity: 0.92;
  }
  .gaia-pdf-msg {
    margin-bottom: 18px;
    border: 1px solid #E5E7EB;
    border-radius: 14px;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
    background: #ffffff;
  }
  .gaia-pdf-msg-head {
    padding: 10px 16px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-bottom: 1px solid #E5E7EB;
  }
  .gaia-pdf-msg-head.user {
    background: #F9FAFB;
    color: #6B7280;
  }
  .gaia-pdf-msg-head.assistant {
    background: #ECFDF5;
    color: #047857;
    border-bottom-color: #A7F3D0;
  }
  .gaia-pdf-msg-body {
    padding: 16px 18px;
    color: #374151;
  }
  .gaia-pdf-msg-body h1,
  .gaia-pdf-msg-body h2 {
    margin: 14px 0 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #D1FAE5;
    font-size: 13px;
    font-weight: 700;
    color: #111827;
    line-height: 1.35;
  }
  .gaia-pdf-msg-body h1:first-child,
  .gaia-pdf-msg-body h2:first-child,
  .gaia-pdf-msg-body h3:first-child {
    margin-top: 0;
  }
  .gaia-pdf-msg-body h3 {
    margin: 12px 0 6px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #065F46;
  }
  .gaia-pdf-msg-body p { margin: 7px 0; }
  .gaia-pdf-msg-body ul,
  .gaia-pdf-msg-body ol {
    margin: 8px 0 10px;
    padding-left: 22px;
  }
  .gaia-pdf-msg-body li { margin: 5px 0; }
  .gaia-pdf-msg-body ul li::marker { color: #059669; }
  .gaia-pdf-msg-body ol li::marker {
    color: #047857;
    font-weight: 600;
  }
  .gaia-pdf-msg-body blockquote {
    margin: 10px 0;
    padding: 8px 12px;
    border-left: 3px solid #6EE7B7;
    background: #F9FAFB;
    color: #6B7280;
    font-style: italic;
    border-radius: 0 8px 8px 0;
  }
  .gaia-pdf-msg-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10px;
  }
  .gaia-pdf-msg-body th {
    background: #F3F4F6;
    text-align: left;
    padding: 7px 9px;
    border: 1px solid #E5E7EB;
    font-weight: 600;
    color: #111827;
  }
  .gaia-pdf-msg-body td {
    padding: 7px 9px;
    border: 1px solid #E5E7EB;
    vertical-align: top;
  }
  .gaia-pdf-msg-body pre {
    margin: 10px 0;
    padding: 10px 12px;
    background: #111827;
    color: #F3F4F6;
    border-radius: 8px;
    font-size: 9px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .gaia-pdf-msg-body code {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .gaia-pdf-msg-body :not(pre) > code {
    background: #F3F4F6;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 10px;
    color: #1F2937;
  }
  .gaia-pdf-msg-body strong { font-weight: 600; color: #111827; }
  .gaia-pdf-msg-body em { font-style: italic; color: #4B5563; }
  .gaia-pdf-msg-body hr {
    margin: 14px 0;
    border: none;
    border-top: 1px solid #E5E7EB;
  }
  .gaia-pdf-footer {
    margin-top: 8px;
    padding-top: 14px;
    border-top: 1px solid #E5E7EB;
    text-align: center;
    font-size: 9px;
    color: #9CA3AF;
  }
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMessageBody(content: string, role: CopilotMessage["role"]): string {
  if (role === "user") {
    return `<p>${escapeHtml(content).replace(/\n/g, "<br/>")}</p>`;
  }
  const normalized = preprocessGaiaMarkdown(content);
  return marked.parse(normalized, { async: false }) as string;
}

function buildExportHtml(messages: CopilotMessage[], labels: GaiaExportLabels): string {
  const exportedAt = new Date().toLocaleString();

  const sections = messages
    .map((msg) => {
      const heading = msg.role === "user" ? labels.userHeading : labels.assistantHeading;
      return `
        <article class="gaia-pdf-msg">
          <div class="gaia-pdf-msg-head ${msg.role}">${escapeHtml(heading)}</div>
          <div class="gaia-pdf-msg-body">${renderMessageBody(msg.content, msg.role)}</div>
        </article>`;
    })
    .join("");

  return `
    <style>${EXPORT_STYLES}</style>
    <div class="gaia-pdf-root">
      <header class="gaia-pdf-header">
        <h1>GAIA — ${escapeHtml(labels.title)}</h1>
        <p>${escapeHtml(labels.exportedAtLabel)}: ${escapeHtml(exportedAt)}</p>
      </header>
      ${sections}
      <footer class="gaia-pdf-footer">GAIA di Growa · GreenhouseOS 5.0</footer>
    </div>`;
}

/** Slice canvas into page-sized strips with consistent top/bottom margins on every page. */
function addCanvasToPdf(
  doc: jsPDF,
  canvas: HTMLCanvasElement,
  marginX: number,
  marginY: number,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const contentHeight = pageHeight - marginY * 2;

  const scale = contentWidth / canvas.width;
  const sliceHeightPx = contentHeight / scale;

  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height) {
    if (pageIndex > 0) {
      doc.addPage();
    }

    const sliceHeight = Math.min(sliceHeightPx, canvas.height - sourceY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const ctx = pageCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
    const renderHeight = sliceHeight * scale;
    doc.addImage(imgData, "JPEG", marginX, marginY, contentWidth, renderHeight);

    sourceY += sliceHeight;
    pageIndex += 1;
  }
}

async function captureExportCanvas(container: HTMLElement): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: EXPORT_WIDTH_PX,
    windowWidth: EXPORT_WIDTH_PX,
    scrollX: 0,
    scrollY: 0,
    logging: false,
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("Empty canvas capture");
  }

  return canvas;
}

/** Fallback when html2canvas fails — structured plain text, still paginated. */
function exportPlainTextPdf(
  doc: jsPDF,
  messages: CopilotMessage[],
  labels: GaiaExportLabels,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - PAGE_MARGIN_X_PT * 2;
  let y = PAGE_MARGIN_Y_PT;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - PAGE_MARGIN_Y_PT) {
      doc.addPage();
      y = PAGE_MARGIN_Y_PT;
    }
  };

  doc.setFillColor(5, 150, 105);
  doc.rect(PAGE_MARGIN_X_PT, y - 12, maxWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`GAIA — ${labels.title}`, PAGE_MARGIN_X_PT + 4, y + 8);
  y += 32;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`${labels.exportedAtLabel}: ${new Date().toLocaleString()}`, PAGE_MARGIN_X_PT, y);
  y += 20;
  doc.setTextColor(17, 24, 39);

  for (const msg of messages) {
    const heading = msg.role === "user" ? labels.userHeading : labels.assistantHeading;
    const html = marked.parse(preprocessGaiaMarkdown(msg.content), { async: false }) as string;
    const el = document.createElement("div");
    el.innerHTML = html;
    const body = (msg.role === "user" ? msg.content : el.textContent ?? msg.content).trim();

    ensureSpace(22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(msg.role === "assistant" ? 4 : 107, msg.role === "assistant" ? 120 : 114, msg.role === "assistant" ? 87 : 128);
    doc.text(heading.toUpperCase(), PAGE_MARGIN_X_PT, y);
    y += 14;
    doc.setTextColor(55, 65, 81);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    for (const line of doc.splitTextToSize(body, maxWidth)) {
      ensureSpace(14);
      doc.text(line, PAGE_MARGIN_X_PT, y);
      y += 14;
    }
    y += 12;
  }
}

export async function exportGaiaChat(
  messages: CopilotMessage[],
  labels: GaiaExportLabels,
): Promise<void> {
  if (messages.length === 0) return;

  const container = document.createElement("div");
  const offscreenTop = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) + 32;
  container.style.cssText = [
    "position:absolute",
    `top:${offscreenTop}px`,
    "left:0",
    `width:${EXPORT_WIDTH_PX}px`,
    "padding:32px",
    "background:#ffffff",
    "box-sizing:border-box",
    "pointer-events:none",
  ].join(";");
  container.innerHTML = buildExportHtml(messages, labels);
  document.body.appendChild(container);

  const filename = `${labels.title.replace(/\s+/g, "_").toLowerCase()}_gaia_${new Date().toISOString().slice(0, 10)}.pdf`;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

  try {
    const canvas = await captureExportCanvas(container);
    addCanvasToPdf(doc, canvas, PAGE_MARGIN_X_PT, PAGE_MARGIN_Y_PT);
    doc.save(filename);
  } catch {
    exportPlainTextPdf(doc, messages, labels);
    doc.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
