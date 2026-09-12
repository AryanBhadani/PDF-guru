import { PDFDocument } from "pdf-lib";
import type { PhotoPdfOptions, PhotoPdfQuality } from "@/types/conversion";

const QUALITY_PRESET: Record<PhotoPdfQuality, { jpeg: number; maxDimension: number | null }> = {
  low: { jpeg: 0.58, maxDimension: 1280 },
  medium: { jpeg: 0.75, maxDimension: 1920 },
  high: { jpeg: 0.88, maxDimension: 2560 },
  original: { jpeg: 0.92, maxDimension: null },
};

export type DecodedImageSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

type PreparedPhoto = {
  bytes: Uint8Array;
  width: number;
  height: number;
  kind: "jpg" | "png";
};

export function detectImageMime(buffer: ArrayBuffer, fallbackType: string, filename: string): string {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  // JPEG magic bytes: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG magic bytes: 89 50 4E 47
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  // WEBP magic bytes: RIFF .... WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";

  return fallbackType || "image/jpeg";
}

/**
 * Resilient image decoder handling mobile Chrome, Android content streams,
 * large camera captures, EXIF orientation, and format quirks.
 */
export async function decodeImageSource(file: File): Promise<DecodedImageSource> {
  // Method 1: direct createImageBitmap with EXIF orientation
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close?.(),
        };
      }
    } catch {
      // Fall through to memory buffer / HTMLImageElement
    }
  }

  // Method 2: read ArrayBuffer to bypass Android ContentProvider streaming locks
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new Error(`Could not read file "${file.name}".`);
  }

  const mime = detectImageMime(buffer, file.type, file.name);
  const blob = new Blob([buffer], { type: mime });

  // Method 2b: createImageBitmap on clean in-memory Blob
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close?.(),
        };
      }
    } catch {
      // Fall through to HTMLImageElement
    }
  }

  // Method 3: HTMLImageElement via object URL (bulletproof on mobile Chrome/Safari with EXIF)
  try {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image element failed to load."));
      img.src = objectUrl;
    });

    if ("decode" in img) {
      try {
        await img.decode();
      } catch {
        // img.decode() can reject on some devices even if onload completed; proceed
      }
    }

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (width > 0 && height > 0) {
      return {
        source: img,
        width,
        height,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      };
    }
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Fall through to FileReader Data URL
  }

  // Method 4: FileReader readAsDataURL fallback
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("FileReader failed."));
      reader.readAsDataURL(blob);
    });

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image element failed with data URL."));
      img.src = dataUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (width > 0 && height > 0) {
      return {
        source: img,
        width,
        height,
        cleanup: () => {},
      };
    }
  } catch {
    // All methods exhausted
  }

  throw new Error(`Could not decode image "${file.name}". The format may be unsupported or corrupted.`);
}

export async function validateImageFile(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    const decoded = await decodeImageSource(file);
    decoded.cleanup();
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : `Could not decode image "${file.name}".`,
    };
  }
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
    });
    if (blob && blob.size > 0) {
      return new Uint8Array(await blob.arrayBuffer());
    }
  } catch {
    // Fallback to toDataURL below
  }

  // Fallback if toBlob fails or returns null under mobile memory pressure
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("Could not compress this image.");
  }
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function preparePhoto(file: File, quality: PhotoPdfQuality): Promise<PreparedPhoto> {
  const decoded = await decodeImageSource(file);
  const imageWidth = decoded.width;
  const imageHeight = decoded.height;
  if (imageWidth < 1 || imageHeight < 1) {
    decoded.cleanup();
    throw new Error(`Could not read image "${file.name}".`);
  }

  const preset = QUALITY_PRESET[quality];

  // Calculate scale factor: NEVER upscale (scale <= 1)
  let scale = 1;
  if (preset.maxDimension) {
    const maxSide = Math.max(imageWidth, imageHeight);
    if (maxSide > preset.maxDimension) {
      scale = preset.maxDimension / maxSide;
    }
  }

  let canvasWidth = Math.max(1, Math.round(imageWidth * scale));
  let canvasHeight = Math.max(1, Math.round(imageHeight * scale));

  // Enforce browser canvas limits (prevent mobile Chrome canvas allocation crashes on huge photos)
  const MAX_CANVAS_DIM = 4096;
  const MAX_CANVAS_AREA = 16_000_000;
  const maxDim = Math.max(canvasWidth, canvasHeight);
  let limitScale = 1;
  if (maxDim > MAX_CANVAS_DIM) {
    limitScale = Math.min(limitScale, MAX_CANVAS_DIM / maxDim);
  }
  if (canvasWidth * limitScale * canvasHeight * limitScale > MAX_CANVAS_AREA) {
    limitScale = Math.min(limitScale, Math.sqrt(MAX_CANVAS_AREA / (canvasWidth * canvasHeight)));
  }
  if (limitScale < 1) {
    canvasWidth = Math.max(1, Math.round(canvasWidth * limitScale));
    canvasHeight = Math.max(1, Math.round(canvasHeight * limitScale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    decoded.cleanup();
    throw new Error(`Could not read image "${file.name}".`);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Preserve complete image, never crop, exact aspect ratio
  ctx.drawImage(decoded.source, 0, 0, imageWidth, imageHeight, 0, 0, canvasWidth, canvasHeight);
  decoded.cleanup();

  const isPng = (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) && quality === "original";
  let bytes: Uint8Array;
  let kind: "jpg" | "png" = "jpg";

  if (isPng) {
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
      if (blob && blob.size > 0) {
        bytes = new Uint8Array(await blob.arrayBuffer());
        kind = "png";
      } else {
        bytes = await canvasToJpeg(canvas, preset.jpeg);
      }
    } catch {
      bytes = await canvasToJpeg(canvas, preset.jpeg);
    }
  } else {
    bytes = await canvasToJpeg(canvas, preset.jpeg);
  }

  canvas.width = 0;
  canvas.height = 0;

  return { bytes, width: canvasWidth, height: canvasHeight, kind };
}

export async function imagesToPdf(
  files: File[],
  options: PhotoPdfOptions = { quality: "medium" },
  onImageError?: (file: File, error: Error) => void
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("Upload at least one image.");
  }

  const pdf = await PDFDocument.create();
  const quality = options.quality ?? "medium";
  let embeddedCount = 0;
  let lastError: Error | null = null;

  for (const file of files) {
    let prepared: PreparedPhoto;
    try {
      prepared = await preparePhoto(file, quality);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(`Could not read image "${file.name}".`);
      lastError = err;
      onImageError?.(file, err);
      continue;
    }

    const image =
      prepared.kind === "png"
        ? await pdf.embedPng(prepared.bytes)
        : await pdf.embedJpg(prepared.bytes);

    // Calculate PDF page size from the image's actual dimensions/aspect ratio (do not force A4)
    const pageWidth = prepared.width;
    const pageHeight = prepared.height;
    const page = pdf.addPage([pageWidth, pageHeight]);

    // Each image fills its PDF page completely without artificial margins or cropping
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
    embeddedCount++;
  }

  if (embeddedCount === 0) {
    throw lastError || new Error("No valid images could be converted.");
  }

  return pdf.save({ useObjectStreams: false });
}
