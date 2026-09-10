import { PDFDocument } from "pdf-lib";

export type CleanMode = "color" | "grayscale" | "bw";

export type Point = { x: number; y: number };

export type Quad = {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
};

export type CleanOptions = {
  brightness: number;
  contrast: number;
  sharpness: number;
  mode: CleanMode;
  cleanup: boolean;
  perspective: boolean;
  rotation: number;
  crop?: { x: number; y: number; width: number; height: number };
  corners?: Quad;
};

export const DEFAULT_CLEAN_OPTIONS: CleanOptions = {
  brightness: 8,
  contrast: 18,
  sharpness: 35,
  mode: "color",
  cleanup: true,
  perspective: true,
  rotation: 0,
};

type Pixel = { r: number; g: number; b: number; a: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 2400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read this image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export function detectDocumentCorners(canvas: HTMLCanvasElement): Quad {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return defaultQuad(canvas.width, canvas.height);
  }
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const sample = (x: number, y: number) => {
    const i = (clamp(Math.round(y), 0, height - 1) * width + clamp(Math.round(x), 0, width - 1)) * 4;
    return luminance(data[i], data[i + 1], data[i + 2]);
  };

  const inset = Math.max(8, Math.round(Math.min(width, height) * 0.04));
  const threshold = 28;

  const scanIn = (from: number, to: number, axis: "x" | "y", fixed: number) => {
    const step = from < to ? 1 : -1;
    let prev = sample(axis === "x" ? from : fixed, axis === "y" ? from : fixed);
    for (let pos = from; step > 0 ? pos <= to : pos >= to; pos += step) {
      const value = sample(axis === "x" ? pos : fixed, axis === "y" ? pos : fixed);
      if (Math.abs(value - prev) > threshold && value < 235) return pos;
      prev = value;
    }
    return from < to ? from + inset : from - inset;
  };

  const left = scanIn(2, width * 0.35, "x", height / 2);
  const right = scanIn(width - 3, width * 0.65, "x", height / 2);
  const top = scanIn(2, height * 0.35, "y", width / 2);
  const bottom = scanIn(height - 3, height * 0.65, "y", width / 2);

  return {
    tl: { x: left, y: top },
    tr: { x: right, y: top },
    br: { x: right, y: bottom },
    bl: { x: left, y: bottom },
  };
}

export function defaultQuad(width: number, height: number): Quad {
  const pad = Math.round(Math.min(width, height) * 0.02);
  return {
    tl: { x: pad, y: pad },
    tr: { x: width - pad, y: pad },
    br: { x: width - pad, y: height - pad },
    bl: { x: pad, y: height - pad },
  };
}

function samplePixel(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): Pixel {
  const sx = clamp(x, 0, width - 1);
  const sy = clamp(y, 0, height - 1);
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const dx = sx - x0;
  const dy = sy - y0;
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const at = (px: number, py: number) => {
    const i = (py * width + px) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  };
  const p00 = at(x0, y0);
  const p10 = at(x1, y0);
  const p01 = at(x0, y1);
  const p11 = at(x1, y1);
  return {
    r: mix(mix(p00.r, p10.r, dx), mix(p01.r, p11.r, dx), dy),
    g: mix(mix(p00.g, p10.g, dx), mix(p01.g, p11.g, dx), dy),
    b: mix(mix(p00.b, p10.b, dx), mix(p01.b, p11.b, dx), dy),
    a: 255,
  };
}

function applyPerspective(source: HTMLCanvasElement, corners: Quad): HTMLCanvasElement {
  const width = Math.max(
    1,
    Math.round(
      Math.max(distance(corners.tl, corners.tr), distance(corners.bl, corners.br))
    )
  );
  const height = Math.max(
    1,
    Math.round(
      Math.max(distance(corners.tl, corners.bl), distance(corners.tr, corners.br))
    )
  );
  const srcCtx = source.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) return source;
  const src = srcCtx.getImageData(0, 0, source.width, source.height);
  const dest = document.createElement("canvas");
  dest.width = width;
  dest.height = height;
  const destCtx = dest.getContext("2d");
  if (!destCtx) return source;
  const out = destCtx.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    const v = height === 1 ? 0 : y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const u = width === 1 ? 0 : x / (width - 1);
      const top = lerpPoint(corners.tl, corners.tr, u);
      const bottom = lerpPoint(corners.bl, corners.br, u);
      const mapped = lerpPoint(top, bottom, v);
      const pixel = samplePixel(src.data, source.width, source.height, mapped.x, mapped.y);
      const i = (y * width + x) * 4;
      out.data[i] = pixel.r;
      out.data[i + 1] = pixel.g;
      out.data[i + 2] = pixel.b;
      out.data[i + 3] = 255;
    }
  }
  destCtx.putImageData(out, 0, 0);
  return dest;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rotateCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const angle = ((degrees % 360) + 360) % 360;
  if (angle === 0) return source;
  const radians = (angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * cos + source.height * sin));
  canvas.height = Math.max(1, Math.round(source.width * sin + source.height * cos));
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function cropCanvas(
  source: HTMLCanvasElement,
  crop: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const x = clamp(Math.round(crop.x), 0, source.width - 1);
  const y = clamp(Math.round(crop.y), 0, source.height - 1);
  const width = clamp(Math.round(crop.width), 1, source.width - x);
  const height = clamp(Math.round(crop.height), 1, source.height - y);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  return canvas;
}

function enhanceImageData(image: ImageData, options: CleanOptions): ImageData {
  const { data } = image;
  const brightness = options.brightness;
  const contrast = options.contrast;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const copy = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    let r = factor * (data[i] - 128) + 128 + brightness;
    let g = factor * (data[i + 1] - 128) + 128 + brightness;
    let b = factor * (data[i + 2] - 128) + 128 + brightness;

    if (options.mode === "grayscale" || options.mode === "bw") {
      const gray = luminance(r, g, b);
      r = g = b = gray;
    }
    if (options.mode === "bw") {
      const value = r > 168 ? 255 : 0;
      r = g = b = value;
    }
    if (options.cleanup) {
      const luma = luminance(r, g, b);
      if (luma > 232) {
        r = 255;
        g = 255;
        b = 255;
      } else if (luma < 28) {
        r = 0;
        g = 0;
        b = 0;
      }
    }

    copy[i] = clamp(r, 0, 255);
    copy[i + 1] = clamp(g, 0, 255);
    copy[i + 2] = clamp(b, 0, 255);
    copy[i + 3] = 255;
  }

  if (options.sharpness > 0) {
    const amount = options.sharpness / 100;
    const width = image.width;
    const height = image.height;
    const sharpened = new Uint8ClampedArray(copy);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = (y * width + x) * 4;
        for (let c = 0; c < 3; c += 1) {
          const center = copy[i + c];
          const blur =
            (copy[i - width * 4 + c] +
              copy[i + width * 4 + c] +
              copy[i - 4 + c] +
              copy[i + 4 + c] +
              center * 4) /
            8;
          sharpened[i + c] = clamp(center + (center - blur) * amount * 2.4, 0, 255);
        }
      }
    }
    return new ImageData(sharpened, width, height);
  }

  return new ImageData(copy, image.width, image.height);
}

export function cleanCanvas(source: HTMLCanvasElement, options: CleanOptions): HTMLCanvasElement {
  let canvas = source;
  if (options.rotation) {
    canvas = rotateCanvas(canvas, options.rotation);
  }
  if (options.perspective && options.corners) {
    canvas = applyPerspective(canvas, options.corners);
  } else if (options.crop) {
    canvas = cropCanvas(canvas, options.crop);
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  const enhanced = enhanceImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), options);
  ctx.putImageData(enhanced, 0, 0);
  return canvas;
}

export async function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Could not process this file."));
      },
      "image/jpeg",
      quality
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export async function cleanedImageToPdf(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const jpeg = await canvasToJpeg(canvas);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedJpg(jpeg);
  const maxWidth = 595.28;
  const maxHeight = 841.89;
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = image.width * ratio;
  const height = image.height * ratio;
  const page = pdf.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return pdf.save({ useObjectStreams: false });
}
