import { PDFDocument, rgb } from "pdf-lib";
import { detectClosestFont, getPdfStandardFont } from "@/lib/fonts";

export interface ScreenshotTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  bgColor: string;
  detectedFontName?: string;
  detectedFontFamily?: string;
}

export interface ModifiedScreenshotText {
  id: string;
  originalText: string;
  newText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  bgColor: string;
  fontFamily?: string;
  detectedFontName?: string;
}

export interface AddedScreenshotText {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  bgColor?: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface ScreenshotWhiteout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface ScreenshotPageData {
  id: string;
  file: File;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  ocrStatus: "idle" | "loading" | "done" | "error";
  ocrProgress: number;
  detectedTexts: ScreenshotTextItem[];
  modifiedTexts: Record<string, ModifiedScreenshotText>;
  deletedTextIds: string[];
  addedTexts: AddedScreenshotText[];
  whiteouts: ScreenshotWhiteout[];
}

/**
 * Samples perimeter pixels around a bounding box to identify the dominant
 * background color behind a text block (e.g. dark mode, light mode, colored cards).
 */
export function sampleBackgroundColor(
  ctx: CanvasRenderingContext2D,
  bbox: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
): string {
  try {
    const samples: [number, number, number][] = [];
    const sampleOffset = 3;

    // Top and bottom edge samples
    const stepX = Math.max(1, Math.floor(bbox.width / 5));
    for (let curX = bbox.x; curX <= bbox.x + bbox.width; curX += stepX) {
      // Above top edge
      const topY = Math.max(0, bbox.y - sampleOffset);
      const clampedX = Math.min(canvasWidth - 1, Math.max(0, curX));
      const topPixel = ctx.getImageData(clampedX, topY, 1, 1).data;
      if (topPixel[3] > 50) {
        samples.push([topPixel[0], topPixel[1], topPixel[2]]);
      }

      // Below bottom edge
      const botY = Math.min(canvasHeight - 1, bbox.y + bbox.height + sampleOffset);
      const botPixel = ctx.getImageData(clampedX, botY, 1, 1).data;
      if (botPixel[3] > 50) {
        samples.push([botPixel[0], botPixel[1], botPixel[2]]);
      }
    }

    // Left and right edge samples
    const stepY = Math.max(1, Math.floor(bbox.height / 3));
    for (let curY = bbox.y; curY <= bbox.y + bbox.height; curY += stepY) {
      const leftX = Math.max(0, bbox.x - sampleOffset);
      const clampedY = Math.min(canvasHeight - 1, Math.max(0, curY));
      const leftPixel = ctx.getImageData(leftX, clampedY, 1, 1).data;
      if (leftPixel[3] > 50) {
        samples.push([leftPixel[0], leftPixel[1], leftPixel[2]]);
      }

      const rightX = Math.min(canvasWidth - 1, bbox.x + bbox.width + sampleOffset);
      const rightPixel = ctx.getImageData(rightX, clampedY, 1, 1).data;
      if (rightPixel[3] > 50) {
        samples.push([rightPixel[0], rightPixel[1], rightPixel[2]]);
      }
    }

    if (samples.length === 0) return "#ffffff";

    // Average color calculation
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    for (const [r, g, b] of samples) {
      rSum += r;
      gSum += g;
      bSum += b;
    }

    const avgR = Math.round(rSum / samples.length);
    const avgG = Math.round(gSum / samples.length);
    const avgB = Math.round(bSum / samples.length);

    return `#${avgR.toString(16).padStart(2, "0")}${avgG.toString(16).padStart(2, "0")}${avgB.toString(16).padStart(2, "0")}`;
  } catch {
    return "#ffffff";
  }
}

/**
 * Samples internal pixels to estimate the existing text color.
 */
export function sampleTextColor(
  ctx: CanvasRenderingContext2D,
  bbox: { x: number; y: number; width: number; height: number },
  bgColorHex: string
): string {
  try {
    const bgRgb = hexToRgbComponents(bgColorHex);
    const bgBrightness = (bgRgb.r * 299 + bgRgb.g * 587 + bgRgb.b * 114) / 1000;

    // Scan center rectangle of text box
    const innerX = Math.round(bbox.x + bbox.width * 0.2);
    const innerY = Math.round(bbox.y + bbox.height * 0.2);
    const innerW = Math.max(1, Math.round(bbox.width * 0.6));
    const innerH = Math.max(1, Math.round(bbox.height * 0.6));

    const imgData = ctx.getImageData(innerX, innerY, innerW, innerH).data;
    let bestDist = 0;
    let bestR = 0;
    let bestG = 0;
    let bestB = 0;

    for (let i = 0; i < imgData.length; i += 16) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];
      if (a < 100) continue;

      const dist = Math.abs(r - bgRgb.r) + Math.abs(g - bgRgb.g) + Math.abs(b - bgRgb.b);
      if (dist > bestDist) {
        bestDist = dist;
        bestR = r;
        bestG = g;
        bestB = b;
      }
    }

    if (bestDist > 60) {
      return `#${bestR.toString(16).padStart(2, "0")}${bestG.toString(16).padStart(2, "0")}${bestB.toString(16).padStart(2, "0")}`;
    }

    // Default to high contrast with background
    return bgBrightness > 128 ? "#000000" : "#ffffff";
  } catch {
    return "#000000";
  }
}

function hexToRgbComponents(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  return {
    r: parseInt(cleanHex.substring(0, 2), 16) || 0,
    g: parseInt(cleanHex.substring(2, 4), 16) || 0,
    b: parseInt(cleanHex.substring(4, 6), 16) || 0,
  };
}

export function hexToRgb(hex: string) {
  const comp = hexToRgbComponents(hex);
  return rgb(comp.r / 255, comp.g / 255, comp.b / 255);
}

/**
 * Runs OCR on a canvas element and extracts line-level text items with coordinates.
 */
export async function runOcrOnScreenshot(
  canvas: HTMLCanvasElement,
  onProgress?: (percent: number) => void
): Promise<ScreenshotTextItem[]> {
  const { recognizeImage } = await import("@/lib/ocr");
  const ocrPage = await recognizeImage(canvas, {
    onProgress: (current, total) => onProgress?.(total > 0 ? (current / total) * 100 : 0),
  });

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const items: ScreenshotTextItem[] = [];
  const scale = canvas.width / (ocrPage.width || canvas.width);

  let idCounter = 1;
  for (const block of ocrPage.blocks) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        const text = line.text?.trim();
        if (!text) continue;

        const x = Math.max(0, Math.round(line.bbox.x0 / scale));
        const y = Math.max(0, Math.round(line.bbox.y0 / scale));
        const width = Math.max(12, Math.round((line.bbox.x1 - line.bbox.x0) / scale));
        const height = Math.max(10, Math.round((line.bbox.y1 - line.bbox.y0) / scale));

        const bgColor = ctx
          ? sampleBackgroundColor(ctx, { x, y, width, height }, canvas.width, canvas.height)
          : "#ffffff";

        const color = ctx
          ? sampleTextColor(ctx, { x, y, width, height }, bgColor)
          : "#000000";

        const fontSize = Math.max(9, Math.round(height * 0.75));

        const detected = detectClosestFont("sans-serif");

        items.push({
          id: `line-${idCounter++}-${x}-${y}`,
          text,
          x,
          y,
          width,
          height,
          fontSize,
          color,
          bgColor,
          detectedFontName: "sans-serif",
          detectedFontFamily: detected.fontFamily,
        });
      }
    }
  }

  return items;
}

/**
 * Converts a data URL to an ArrayBuffer.
 */
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Builds a multi-page PDF from screenshot pages.
 * Preserves the original screenshot image 100% full-bleed as the background,
 * covers deleted/modified text with matching background rectangles, and
 * draws new/modified text in-place.
 */
export async function exportScreenshotsToPdf(pages: ScreenshotPageData[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const pageData of pages) {
    // 1. Prepare image bytes
    // Ensure image is embedded as PNG or JPEG
    let imageBytes: ArrayBuffer;
    let isPng = false;

    if (pageData.dataUrl.startsWith("data:image/png")) {
      imageBytes = dataUrlToArrayBuffer(pageData.dataUrl);
      isPng = true;
    } else if (pageData.dataUrl.startsWith("data:image/jpeg") || pageData.dataUrl.startsWith("data:image/jpg")) {
      imageBytes = dataUrlToArrayBuffer(pageData.dataUrl);
      isPng = false;
    } else {
      // For WEBP or other formats, convert to PNG via canvas
      const img = new Image();
      img.src = pageData.dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image for PDF embedding"));
      });
      const offscreen = document.createElement("canvas");
      offscreen.width = pageData.width;
      offscreen.height = pageData.height;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        offCtx.drawImage(img, 0, 0);
        const pngUrl = offscreen.toDataURL("image/png");
        imageBytes = dataUrlToArrayBuffer(pngUrl);
        isPng = true;
      } else {
        imageBytes = await pageData.file.arrayBuffer();
        isPng = true;
      }
    }

    const embeddedImage = isPng
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

    // 2. Add PDF page with exact pixel dimensions
    const pdfPage = pdfDoc.addPage([pageData.width, pageData.height]);

    // 3. Draw screenshot image full bleed at (0, 0, width, height)
    pdfPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: pageData.width,
      height: pageData.height,
    });

    // 4. Whiteout / erase deleted detected text items
    for (const delId of pageData.deletedTextIds) {
      const item = pageData.detectedTexts.find((t) => t.id === delId);
      if (item) {
        const pdfY = pageData.height - item.y - item.height;
        pdfPage.drawRectangle({
          x: item.x - 2,
          y: pdfY - 2,
          width: item.width + 4,
          height: item.height + 4,
          color: hexToRgb(item.bgColor || "#ffffff"),
          borderWidth: 0,
        });
      }
    }

    // 5. Apply modified text items (mask original + draw replacement)
    for (const mod of Object.values(pageData.modifiedTexts)) {
      const pdfY = pageData.height - mod.y - mod.height;
      // Mask original area
      pdfPage.drawRectangle({
        x: mod.x - 2,
        y: pdfY - 2,
        width: Math.max(mod.width + 4, 10),
        height: mod.height + 4,
        color: hexToRgb(mod.bgColor || "#ffffff"),
        borderWidth: 0,
      });

      // Draw replacement text
      if (mod.newText.trim()) {
        const font = await getPdfStandardFont(pdfDoc, mod.fontFamily, mod.detectedFontName, false);
        // Baseline calculation: PDF text origin is bottom-left of baseline
        const baselineY = pdfY + Math.max(2, Math.round(mod.height * 0.22));
        pdfPage.drawText(mod.newText, {
          x: mod.x,
          y: baselineY,
          size: mod.fontSize,
          font,
          color: hexToRgb(mod.color || "#000000"),
        });
      }
    }

    // 6. Draw whiteout / eraser patches
    for (const whiteout of pageData.whiteouts) {
      const pdfY = pageData.height - whiteout.y - whiteout.height;
      pdfPage.drawRectangle({
        x: whiteout.x,
        y: pdfY,
        width: whiteout.width,
        height: whiteout.height,
        color: hexToRgb(whiteout.color || "#ffffff"),
        borderWidth: 0,
      });
    }

    // 7. Draw added text elements
    for (const added of pageData.addedTexts) {
      if (!added.text.trim()) continue;
      const pdfY = pageData.height - added.y - added.height;

      // Draw background if specified
      if (added.bgColor && added.bgColor !== "transparent") {
        pdfPage.drawRectangle({
          x: added.x,
          y: pdfY,
          width: added.width,
          height: added.height,
          color: hexToRgb(added.bgColor),
          borderWidth: 0,
        });
      }

      const font = await getPdfStandardFont(pdfDoc, added.fontFamily, undefined, added.bold || false);
      const baselineY = pdfY + Math.max(2, Math.round(added.height * 0.22));
      pdfPage.drawText(added.text, {
        x: added.x + 2,
        y: baselineY,
        size: added.fontSize,
        font,
        color: hexToRgb(added.color || "#000000"),
      });
    }
  }

  return await pdfDoc.save();
}
