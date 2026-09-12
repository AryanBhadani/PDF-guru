import { PDFDocument, rgb } from "pdf-lib";
import type { PDFPageProxy } from "pdfjs-dist";
import { detectClosestFont, getPdfStandardFont } from "@/lib/fonts";

export type EditorTool = "select" | "add-text" | "add-image" | "whiteout";

export type EditorTextItem = {
  id: string;
  text: string;
  x: number; // PDF points, origin bottom-left
  y: number; // PDF points, origin bottom-left
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
  detectedFontName?: string;
  detectedFontFamily?: string;
  color?: string;
};

export type TextReplacement = {
  id: string;
  originalText: string;
  newText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string; // "auto" or font id from 30 fonts
  detectedFontName?: string;
  color: string;
  isDeleted?: boolean;
};

export type AddedTextItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string; // font id from 30 fonts
  color: string;
  bold?: boolean;
  italic?: boolean;
};

export type AddedImageItem = {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WhiteoutItem = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type PageEdits = {
  replacements: TextReplacement[];
  addedTexts: AddedTextItem[];
  addedImages: AddedImageItem[];
  whiteouts: WhiteoutItem[];
};

export type EditorDocEdits = Record<number, PageEdits>;

export function emptyPageEdits(): PageEdits {
  return {
    replacements: [],
    addedTexts: [],
    addedImages: [],
    whiteouts: [],
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(
    normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized,
    16
  );
  if (Number.isNaN(value)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

/**
 * Extract selectable text items from a PDF.js page proxy
 */
export async function extractPageTextItems(page: PDFPageProxy): Promise<EditorTextItem[]> {
  const content = await page.getTextContent();
  const items: EditorTextItem[] = [];

  for (let i = 0; i < content.items.length; i++) {
    const item = content.items[i] as {
      str?: string;
      transform?: number[];
      width?: number;
      height?: number;
      fontName?: string;
    };
    if (!item.str || !item.transform) continue;
    const text = item.str;
    if (!text.trim()) continue;

    // transform: [scaleX, skewY, skewX, scaleY, transX, transY]
    const x = item.transform[4];
    const y = item.transform[5];
    const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12;
    const width = Math.max(12, item.width || text.length * (fontSize * 0.5));
    const height = Math.max(8, item.height || fontSize);

    const detected = detectClosestFont(item.fontName);

    items.push({
      id: `item-${i}-${Math.round(x)}-${Math.round(y)}`,
      text,
      x,
      y: y - height * 0.15, // Normalize baseline
      width,
      height,
      fontSize: Math.max(8, Math.round(fontSize * 10) / 10),
      fontName: item.fontName,
      detectedFontName: detected.name,
      detectedFontFamily: detected.id,
      color: "#000000",
    });
  }

  return items;
}

/**
 * Run OCR on a scanned page canvas and return text items with coordinates
 */
export async function ocrPageToTextItems(
  canvas: HTMLCanvasElement,
  pageHeight: number,
  onProgress?: (progress: number) => void
): Promise<EditorTextItem[]> {
  const { recognizeImage } = await import("@/lib/ocr");
  const ocrPage = await recognizeImage(canvas, {
    onProgress: (current, total) => onProgress?.(total > 0 ? (current / total) * 100 : 0),
  });

  const items: EditorTextItem[] = [];
  const scale = canvas.width / (ocrPage.width || canvas.width);

  for (const block of ocrPage.blocks) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        if (!line.text?.trim()) continue;
        const x = line.bbox.x0 / scale;
        const width = Math.max(12, (line.bbox.x1 - line.bbox.x0) / scale);
        const height = Math.max(8, (line.bbox.y1 - line.bbox.y0) / scale);
        const y = pageHeight - line.bbox.y1 / scale;

        items.push({
          id: `ocr-${Math.round(x)}-${Math.round(y)}`,
          text: line.text.trim(),
          x,
          y,
          width,
          height,
          fontSize: Math.max(8, Math.round(height * 0.75)),
          detectedFontName: "Arial",
          detectedFontFamily: "arial",
          color: "#000000",
        });
      }
    }
  }

  return items;
}

/**
 * Apply all in-place edits to the original PDF without converting to Word or plain text.
 */
export async function applyPdfEdits(
  originalBytes: ArrayBuffer,
  edits: EditorDocEdits
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });

  const pages = pdfDoc.getPages();

  for (let pageNum = 1; pageNum <= pages.length; pageNum++) {
    const pageEdits = edits[pageNum];
    if (!pageEdits) continue;

    const page = pages[pageNum - 1];

    // 1. Apply Whiteouts
    for (const w of pageEdits.whiteouts || []) {
      const color = hexToRgb(w.color || "#ffffff");
      page.drawRectangle({
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        color: rgb(color.r, color.g, color.b),
        borderColor: rgb(color.r, color.g, color.b),
      });
    }

    // 2. Apply Text Replacements & Deletions
    for (const rep of pageEdits.replacements || []) {
      // Draw background patch over original text
      page.drawRectangle({
        x: rep.x - 1,
        y: rep.y - 1,
        width: rep.width + 2,
        height: rep.height + 2,
        color: rgb(1, 1, 1),
      });

      // If not deleted and has new text, draw replacement
      if (!rep.isDeleted && rep.newText && rep.newText.trim().length > 0) {
        const font = await getPdfStandardFont(pdfDoc, rep.fontFamily, rep.detectedFontName);
        const c = hexToRgb(rep.color || "#000000");
        page.drawText(rep.newText, {
          x: rep.x,
          y: rep.y + Math.max(1, rep.height * 0.15),
          size: rep.fontSize || 12,
          font,
          color: rgb(c.r, c.g, c.b),
        });
      }
    }

    // 3. Apply Added Texts
    for (const added of pageEdits.addedTexts || []) {
      if (!added.text || !added.text.trim()) continue;
      const font = await getPdfStandardFont(pdfDoc, added.fontFamily, undefined, added.bold);
      const c = hexToRgb(added.color || "#000000");
      page.drawText(added.text, {
        x: added.x,
        y: added.y + Math.max(1, added.height * 0.15),
        size: added.fontSize || 14,
        font,
        color: rgb(c.r, c.g, c.b),
      });
    }

    // 4. Apply Added Images
    for (const imgItem of pageEdits.addedImages || []) {
      if (!imgItem.dataUrl) continue;
      try {
        const isPng = imgItem.dataUrl.startsWith("data:image/png");
        const comma = imgItem.dataUrl.indexOf(",");
        const base64 = comma !== -1 ? imgItem.dataUrl.slice(comma + 1) : imgItem.dataUrl;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const embedded = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        page.drawImage(embedded, {
          x: imgItem.x,
          y: imgItem.y,
          width: imgItem.width,
          height: imgItem.height,
        });
      } catch (err) {
        console.error("Failed to embed added image:", err);
      }
    }
  }

  return await pdfDoc.save({ useObjectStreams: false });
}
