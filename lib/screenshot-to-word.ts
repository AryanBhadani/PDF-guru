import { recognizeImage, type OcrPage } from "@/lib/ocr";
import {
  canvasToPngBytes,
  layoutPagesToDocx,
  ocrPageToLayoutBlocks,
  type LayoutBlock,
  type LayoutImage,
  type LayoutPage,
} from "@/lib/document-layout";
import type { ProgressCallback } from "@/types/conversion";

export type ScreenshotToWordResult = {
  blob: Blob;
  pageCount: number;
  charCount: number;
  imageCount: number;
  tableCount: number;
};

type Region = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function overlapsText(region: Region, page: OcrPage, scaleX: number, scaleY: number): boolean {
  for (const block of page.blocks) {
    for (const paragraph of block.paragraphs) {
      const box = paragraph.bbox;
      const tx = box.x0 * scaleX;
      const ty = box.y0 * scaleY;
      const tw = Math.max(1, (box.x1 - box.x0) * scaleX);
      const th = Math.max(1, (box.y1 - box.y0) * scaleY);
      const overlapX = Math.max(0, Math.min(region.x + region.width, tx + tw) - Math.max(region.x, tx));
      const overlapY = Math.max(0, Math.min(region.y + region.height, ty + th) - Math.max(region.y, ty));
      if (overlapX * overlapY > region.width * region.height * 0.35) return true;
    }
  }
  return false;
}

function isUniform(data: Uint8ClampedArray): boolean {
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min < 18;
}

async function extractVisualRegions(
  canvas: HTMLCanvasElement,
  ocr: OcrPage
): Promise<LayoutImage[]> {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || width < 40 || height < 40) return [];

  const step = Math.max(16, Math.round(Math.min(width, height) / 28));
  const visited = new Uint8Array(Math.ceil(width / step) * Math.ceil(height / step));
  const cols = Math.ceil(width / step);
  const images: LayoutImage[] = [];
  const scaleX = width / Math.max(1, ocr.width);
  const scaleY = height / Math.max(1, ocr.height);

  const indexAt = (x: number, y: number) => Math.floor(y / step) * cols + Math.floor(x / step);

  for (let y = 0; y < height && images.length < 6; y += step) {
    for (let x = 0; x < width && images.length < 6; x += step) {
      const idx = indexAt(x, y);
      if (visited[idx]) continue;
      const sampleW = Math.min(step, width - x);
      const sampleH = Math.min(step, height - y);
      const sample = ctx.getImageData(x, y, sampleW, sampleH).data;
      if (isUniform(sample)) {
        visited[idx] = 1;
        continue;
      }

      let minX = x;
      let minY = y;
      let maxX = x + sampleW;
      let maxY = y + sampleH;
      const stack = [[x, y]];
      visited[idx] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop() as [number, number];
        const neighbors = [
          [cx + step, cy],
          [cx - step, cy],
          [cx, cy + step],
          [cx, cy - step],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nidx = indexAt(nx, ny);
          if (visited[nidx]) continue;
          const nw = Math.min(step, width - nx);
          const nh = Math.min(step, height - ny);
          const next = ctx.getImageData(nx, ny, nw, nh).data;
          if (isUniform(next)) {
            visited[nidx] = 1;
            continue;
          }
          visited[nidx] = 1;
          stack.push([nx, ny]);
          minX = Math.min(minX, nx);
          minY = Math.min(minY, ny);
          maxX = Math.max(maxX, nx + nw);
          maxY = Math.max(maxY, ny + nh);
        }
      }

      const region: Region = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
      if (region.width < 48 || region.height < 48) continue;
      if (region.width > width * 0.9 && region.height > height * 0.9) continue;
      if (overlapsText(region, ocr, scaleX, scaleY)) continue;

      const crop = document.createElement("canvas");
      crop.width = region.width;
      crop.height = region.height;
      const cropCtx = crop.getContext("2d");
      if (!cropCtx) continue;
      cropCtx.drawImage(canvas, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
      const data = await canvasToPngBytes(crop);
      crop.width = 0;
      crop.height = 0;
      images.push({
        kind: "image",
        data,
        widthPx: region.width,
        heightPx: region.height,
        format: "png",
      });
    }
  }
  return images;
}

async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    bitmap = await createImageBitmap(file);
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    bitmap.close?.();
    throw new Error(`Could not read image "${file.name}".`);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return canvas;
}

export async function convertScreenshotsToDocx(
  files: File[],
  onProgress?: ProgressCallback
): Promise<ScreenshotToWordResult> {
  if (files.length === 0) {
    throw new Error("Upload at least one screenshot.");
  }

  const pages: LayoutPage[] = [];
  let charCount = 0;
  let imageCount = 0;
  let tableCount = 0;
  const total = files.length;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const canvas = await fileToCanvas(file);
    onProgress?.(index, total);
    const ocr = await recognizeImage(canvas, { language: "eng" });
    const widthPt = Math.min(792, Math.max(420, canvas.width * 0.5));
    const heightPt = widthPt * (canvas.height / Math.max(1, canvas.width));
    const blocks: LayoutBlock[] = ocrPageToLayoutBlocks(ocr, widthPt, heightPt);
    const visuals = await extractVisualRegions(canvas, ocr);
    blocks.push(...visuals);
    imageCount += visuals.length;
    tableCount += blocks.filter((block) => block.kind === "table").length;
    charCount += blocks
      .filter((block): block is Extract<LayoutBlock, { kind: "paragraph" }> => block.kind === "paragraph")
      .reduce((sum, block) => sum + block.runs.map((run) => run.text).join("").length, 0);
    if (blocks.length === 0) {
      blocks.push({
        kind: "paragraph",
        runs: [{ text: "No readable text was found in this screenshot.", italic: true, fontSize: 11 }],
      });
    }
    pages.push({ widthPt, heightPt, blocks });
    canvas.width = 0;
    canvas.height = 0;
    onProgress?.(index + 1, total);
  }

  const blob = await layoutPagesToDocx(pages);
  return {
    blob,
    pageCount: pages.length,
    charCount,
    imageCount,
    tableCount,
  };
}
