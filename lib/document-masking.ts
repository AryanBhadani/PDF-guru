import { PDFDocument } from "pdf-lib";
import { canvasToBlob, loadPdfJsDocument, renderPageToCanvas, yieldToMain } from "@/lib/pdf-render";
import { createId } from "@/lib/utils";
import type { MaskRect, MaskSourceKind } from "@/types/masking";

const AADHAAR_RE = /\b(?:\d{4}[\s-]?\d{4}[\s-]?\d{4}|\d{12})\b/g;
const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;

export function detectSensitiveHints(text: string): string[] {
  const hints: string[] = [];
  if (AADHAAR_RE.test(text)) hints.push("Possible Aadhaar number");
  AADHAAR_RE.lastIndex = 0;
  if (PAN_RE.test(text)) hints.push("Possible PAN number");
  PAN_RE.lastIndex = 0;
  return hints;
}

export async function extractPdfTextSample(file: File): Promise<string> {
  const pdf = await loadPdfJsDocument(file);
  const pagesToScan = Math.min(pdf.numPages, 3);
  let text = "";
  for (let i = 1; i <= pagesToScan; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map((item) => {
        const typed = item as { str?: string };
        return typed.str ?? "";
      })
      .join(" ");
    page.cleanup();
  }
  await pdf.destroy();
  return text;
}

type TextPiece = {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export async function detectSensitiveRects(file: File): Promise<{ rects: MaskRect[]; hints: string[] }> {
  const pdf = await loadPdfJsDocument(file);
  const rects: MaskRect[] = [];
  const hintSet = new Set<string>();

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const pieces: TextPiece[] = [];

    for (const raw of content.items) {
      const item = raw as { str?: string; transform?: number[]; width?: number; height?: number };
      if (!item.str?.trim() || !item.transform) continue;
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      const w = item.width ?? item.str.length * 6;
      const h = item.height ?? Math.abs(transform[3] || 10);
      pieces.push({ str: item.str, x, y, w, h });
    }

    const lines = groupLinePieces(pieces);
    for (const line of lines) {
      const joined = line.map((p) => p.str).join(" ").toUpperCase();
      if (AADHAAR_RE.test(joined)) hintSet.add("Possible Aadhaar number");
      AADHAAR_RE.lastIndex = 0;
      if (PAN_RE.test(joined)) hintSet.add("Possible PAN number");
      PAN_RE.lastIndex = 0;

      const hasSensitive = AADHAAR_RE.test(joined) || PAN_RE.test(joined);
      AADHAAR_RE.lastIndex = 0;
      PAN_RE.lastIndex = 0;
      if (!hasSensitive) continue;

      const minX = Math.min(...line.map((p) => p.x));
      const minY = Math.min(...line.map((p) => p.y));
      const maxX = Math.max(...line.map((p) => p.x + p.w));
      const maxY = Math.max(...line.map((p) => p.y + p.h));
      const padX = (maxX - minX) * 0.04;
      const padY = (maxY - minY) * 0.35;
      const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle([
        minX - padX,
        minY - padY,
        maxX + padX,
        maxY + padY,
      ]);
      const left = Math.min(vx1, vx2) / viewport.width;
      const top = Math.min(vy1, vy2) / viewport.height;
      const width = Math.abs(vx2 - vx1) / viewport.width;
      const height = Math.abs(vy2 - vy1) / viewport.height;
      rects.push({
        id: createId(),
        pageIndex: pageNumber - 1,
        x: clamp01(left),
        y: clamp01(top),
        width: Math.min(1 - clamp01(left), Math.max(0.04, width)),
        height: Math.min(1 - clamp01(top), Math.max(0.02, height)),
      });
    }

    page.cleanup();
  }

  await pdf.destroy();
  return { rects, hints: Array.from(hintSet) };
}

function groupLinePieces(pieces: TextPiece[]): TextPiece[][] {
  const sorted = [...pieces].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextPiece[][] = [];
  for (const piece of sorted) {
    const line = lines.find((group) => Math.abs(group[0].y - piece.y) < Math.max(4, piece.h * 0.6));
    if (line) line.push(piece);
    else lines.push([piece]);
  }
  return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export async function maskImageFile(file: File, rects: MaskRect[]): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not mask this image.");
  }
  ctx.drawImage(bitmap, 0, 0);
  drawRects(ctx, rects.filter((rect) => rect.pageIndex === 0), canvas.width, canvas.height);
  const type = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const blob = await canvasToBlob(canvas, type, 0.92);
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

export async function maskPdfFile(
  file: File,
  rects: MaskRect[],
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const source = await loadPdfJsDocument(file);
  const output = await PDFDocument.create();

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
    const page = await source.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1400 / Math.max(viewport.width, viewport.height));
    const canvas = await renderPageToCanvas(page, scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not mask this PDF page.");
    }
    drawRects(ctx, rects.filter((rect) => rect.pageIndex === pageNumber - 1), canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, "jpg", 0.88);
    const image = await output.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const pdfPage = output.addPage([viewport.width, viewport.height]);
    pdfPage.drawImage(image, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
    onProgress?.(pageNumber, source.numPages);
    await yieldToMain();
  }

  await source.destroy();
  return output.save({ useObjectStreams: true });
}

function drawRects(
  ctx: CanvasRenderingContext2D,
  rects: MaskRect[],
  width: number,
  height: number
) {
  ctx.fillStyle = "#111111";
  for (const rect of rects) {
    const x = Math.max(0, rect.x * width);
    const y = Math.max(0, rect.y * height);
    const w = Math.min(width - x, rect.width * width);
    const h = Math.min(height - y, rect.height * height);
    if (w > 1 && h > 1) {
      ctx.fillRect(x, y, w, h);
    }
  }
}

export function sourceKindFromFile(file: File): MaskSourceKind {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
}

export function maskedFileName(file: File, kind: MaskSourceKind): string {
  const base = file.name.replace(/\.[^.]+$/, "") || "document";
  if (kind === "pdf") return `${base}-masked.pdf`;
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  return `${base}-masked.${ext}`;
}
