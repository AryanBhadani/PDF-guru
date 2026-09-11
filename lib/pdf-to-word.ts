import type { PDFPageProxy } from "pdfjs-dist";
import { getPdfJs, loadPdfJsDocument, renderPageToCanvas, yieldToMain } from "@/lib/pdf-render";
import { recognizeImage } from "@/lib/ocr";
import {
  canvasToPngBytes,
  layoutPagesToDocx,
  ocrPageToLayoutBlocks,
  wordsToLayoutBlocks,
  type LayoutBlock,
  type LayoutImage,
  type LayoutPage,
} from "@/lib/document-layout";
import type { ProgressCallback } from "@/types/conversion";

export type PdfTextLine = {
  pageNumber: number;
  text: string;
};

export type PdfToWordResult = {
  blob: Blob;
  lines: PdfTextLine[];
  charCount: number;
  pageCount: number;
  likelyScanned: boolean;
  usedOcr: boolean;
};

type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
};

type PdfOperatorImage = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function fontFlags(name: string): { bold: boolean; italic: boolean } {
  const lower = name.toLowerCase();
  return {
    bold: /bold|black|heavy|semibold|demi/.test(lower),
    italic: /italic|oblique/.test(lower),
  };
}

async function collectPageImages(page: PDFPageProxy): Promise<PdfOperatorImage[]> {
  const pdfjs = await getPdfJs();
  const ops = await page.getOperatorList();
  const images: PdfOperatorImage[] = [];
  let x = 0;
  let y = 0;
  let scaleX = 1;
  let scaleY = 1;
  const { OPS } = pdfjs;
  for (let i = 0; i < ops.fnArray.length; i += 1) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as number[] | undefined;
    if (fn === OPS.transform && args && args.length >= 6) {
      scaleX = args[0] || 1;
      scaleY = args[3] || 1;
      x = args[4] || 0;
      y = args[5] || 0;
    }
    if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) {
      images.push({
        x,
        y,
        width: Math.abs(scaleX),
        height: Math.abs(scaleY),
      });
    }
  }
  return images;
}

async function cropCanvasRegion(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number },
  pageHeight: number,
  scale: number
): Promise<LayoutImage | null> {
  const sx = Math.max(0, Math.floor(region.x * scale));
  const sy = Math.max(0, Math.floor((pageHeight - region.y - region.height) * scale));
  const sw = Math.min(canvas.width - sx, Math.max(8, Math.floor(region.width * scale)));
  const sh = Math.min(canvas.height - sy, Math.max(8, Math.floor(region.height * scale)));
  if (sw < 24 || sh < 24) return null;
  if (sw > canvas.width * 0.92 && sh > canvas.height * 0.92) return null;

  const crop = document.createElement("canvas");
  crop.width = sw;
  crop.height = sh;
  const ctx = crop.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const sample = ctx.getImageData(0, 0, Math.min(sw, 48), Math.min(sh, 48)).data;
  let variance = 0;
  let last = sample[0];
  for (let i = 0; i < sample.length; i += 4) {
    variance += Math.abs(sample[i] - last);
    last = sample[i];
  }
  if (variance < 80) return null;

  const data = await canvasToPngBytes(crop);
  crop.width = 0;
  crop.height = 0;
  return {
    kind: "image",
    data,
    widthPx: sw,
    heightPx: sh,
    format: "png",
  };
}

function blocksToLines(pageNumber: number, blocks: LayoutBlock[]): PdfTextLine[] {
  const lines: PdfTextLine[] = [];
  for (const block of blocks) {
    if (block.kind === "paragraph") {
      const text = block.runs.map((run) => run.text).join("").replace(/\s+/g, " ").trim();
      if (text) lines.push({ pageNumber, text });
    } else if (block.kind === "table") {
      for (const row of block.rows) {
        const text = row.filter(Boolean).join(" | ").trim();
        if (text) lines.push({ pageNumber, text });
      }
    }
  }
  return lines;
}

export async function convertPdfToDocx(
  file: File,
  onProgress?: ProgressCallback
): Promise<PdfToWordResult> {
  const pdf = await loadPdfJsDocument(file);
  const pages: LayoutPage[] = [];
  const lines: PdfTextLine[] = [];
  let charCount = 0;
  let usedOcr = false;
  const pageCount = pdf.numPages;

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];

    for (const item of content.items) {
      if (!("str" in item) || typeof item.str !== "string") continue;
      const text = item.str.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const transform = "transform" in item ? item.transform : [1, 0, 0, 1, 0, 0];
      const fontSize = Math.abs(Number(transform[3]) || Number(transform[0]) || 11);
      const fontName = "fontName" in item && typeof item.fontName === "string" ? item.fontName : "";
      items.push({
        str: text,
        x: Number(transform[4]) || 0,
        y: viewport.height - (Number(transform[5]) || 0),
        width: "width" in item ? Number(item.width) || text.length * fontSize * 0.5 : text.length * fontSize * 0.5,
        height: fontSize,
        fontName,
        fontSize: Math.max(8, Math.min(36, fontSize)),
      });
    }

    const selectableChars = items.reduce((sum, item) => sum + item.str.length, 0);
    const likelyScannedPage = selectableChars < 24;
    let blocks: LayoutBlock[] = [];

    if (!likelyScannedPage) {
      const flags = items.map((item) => {
        const style = fontFlags(item.fontName);
        return {
          text: item.str,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          fontSize: item.fontSize,
          fontName: item.fontName,
          bold: style.bold,
          italic: style.italic,
        };
      });
      blocks = wordsToLayoutBlocks(flags, viewport.width);

      try {
        const imageOps = await collectPageImages(page);
        if (imageOps.length > 0 && imageOps.length <= 8) {
          const canvas = await renderPageToCanvas(page, 1.4);
          for (const image of imageOps) {
            const cropped = await cropCanvasRegion(canvas, image, viewport.height, 1.4);
            if (cropped) blocks.push(cropped);
          }
          canvas.width = 0;
          canvas.height = 0;
        }
      } catch {
        /* images are best-effort */
      }
    } else {
      usedOcr = true;
      const canvas = await renderPageToCanvas(page, 2);
      const ocr = await recognizeImage(canvas, { language: "eng" });
      blocks = ocrPageToLayoutBlocks(ocr, viewport.width, viewport.height);
      canvas.width = 0;
      canvas.height = 0;
    }

    const pageLines = blocksToLines(pageNumber, blocks);
    lines.push(...pageLines);
    charCount += pageLines.reduce((sum, line) => sum + line.text.length, 0);
    pages.push({
      widthPt: viewport.width,
      heightPt: viewport.height,
      blocks,
    });

    page.cleanup();
    onProgress?.(pageNumber, pageCount);
    await yieldToMain();
  }

  await pdf.destroy();
  const blob = await layoutPagesToDocx(pages);
  const likelyScanned = usedOcr || charCount < Math.max(40, pageCount * 12);
  return {
    blob,
    lines,
    charCount,
    pageCount,
    likelyScanned,
    usedOcr,
  };
}

export async function extractPdfText(
  file: File,
  onProgress?: ProgressCallback
): Promise<{ lines: PdfTextLine[]; pageCount: number; charCount: number }> {
  const result = await convertPdfToDocx(file, onProgress);
  return {
    lines: result.lines,
    pageCount: result.pageCount,
    charCount: result.charCount,
  };
}
