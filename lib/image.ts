import { PDFDocument } from "pdf-lib";
import type { PhotoPdfOptions, PhotoPdfQuality } from "@/types/conversion";
import {
  detectFileSignature,
  parseImageDimensionsFromBytes,
} from "./file-type";

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
  const sig = detectFileSignature(buffer);
  if (sig.kind === "jpeg") return "image/jpeg";
  if (sig.kind === "png") return "image/png";
  if (sig.kind === "webp") return "image/webp";
  if (sig.kind === "heic") return sig.mime;
  if (sig.kind === "gif") return "image/gif";
  if (sig.kind === "bmp") return "image/bmp";

  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".jfif")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";

  return fallbackType || "image/jpeg";
}

/**
 * Resilient image decoder following the required 4-tier fallback order:
 * 1. createImageBitmap (with EXIF orientation fallback to normal)
 * 2. Object URL + HTMLImageElement (with byte-signature corrected MIME Blob)
 * 3. FileReader / Data URL + HTMLImageElement
 * 4. Byte/signature detection as last resort with informative error messages
 */
export async function decodeImageSource(fileOrBlob: File | Blob): Promise<DecodedImageSource> {
  const fileName = "name" in fileOrBlob ? (fileOrBlob as File).name : "image";

  // Tier 1: createImageBitmap
  if (typeof createImageBitmap !== "undefined") {
    // 1a: Try with EXIF orientation
    try {
      const bitmap = await createImageBitmap(fileOrBlob, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close?.(),
        };
      }
    } catch {
      // 1b: Try without imageOrientation option (some mobile WebViews reject the options object)
      try {
        const bitmap = await createImageBitmap(fileOrBlob);
        if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
          return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            cleanup: () => bitmap.close?.(),
          };
        }
      } catch {
        // Proceed to Tier 2
      }
    }
  }

  // Read array buffer to handle Android ContentProvider streams and detect real MIME
  let buffer: ArrayBuffer;
  try {
    buffer = await fileOrBlob.arrayBuffer();
  } catch {
    throw new Error(`Could not read file "${fileName}".`);
  }

  const sig = detectFileSignature(buffer);
  const detectedMime = sig.kind !== "unknown" ? sig.mime : detectImageMime(buffer, fileOrBlob.type, fileName);
  // Ensure typed blob so browsers won't reject decoding generic application/octet-stream
  const typedBlob = fileOrBlob.type === detectedMime ? fileOrBlob : new Blob([buffer], { type: detectedMime });

  // Tier 1b (retry on clean in-memory Typed Blob if original File had streaming locks)
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(typedBlob, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close?.(),
        };
      }
    } catch {
      try {
        const bitmap = await createImageBitmap(typedBlob);
        if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
          return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            cleanup: () => bitmap.close?.(),
          };
        }
      } catch {
        // Proceed to Tier 2
      }
    }
  }

  // Tier 2: Object URL + Image (bulletproof on mobile Chrome/Safari with CSS EXIF default)
  try {
    const objectUrl = URL.createObjectURL(typedBlob);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image element failed to load."));
      img.src = objectUrl;
    });

    if ("decode" in img) {
      try {
        await img.decode();
      } catch {
        // img.decode() can reject on some mobile engines even if onload finished; ignore
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
    // Proceed to Tier 3
  }

  // Tier 3: FileReader / Data URL
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("FileReader failed."));
      reader.readAsDataURL(typedBlob);
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
    // Proceed to Tier 4
  }

  // Tier 4: Byte/signature detection as last resort with informative error messages
  if (sig.kind === "heic") {
    throw new Error(
      `"${fileName}" is in HEIC/HEIF format, which is not supported by this browser. Please use JPG or PNG, or convert it first.`
    );
  }
  if (sig.kind === "pdf") {
    throw new Error(`"${fileName}" is a PDF document, not an image file.`);
  }

  const dims = parseImageDimensionsFromBytes(buffer);
  if (dims && dims.width > 0 && dims.height > 0) {
    throw new Error(`Could not decode image "${fileName}". The image data may be corrupted or truncated.`);
  }

  throw new Error(`Could not decode "${fileName}". Please try another image.`);
}

/**
 * Validates that an image file can be decoded properly.
 */
export async function validateImageFile(file: File | Blob): Promise<{ valid: boolean; error?: string }> {
  const fileName = "name" in file ? (file as File).name : "image";
  try {
    const decoded = await decodeImageSource(file);
    decoded.cleanup();
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : `Could not decode "${fileName}". Please try another image.`,
    };
  }
}

/**
 * Convert any image File or Blob to an HTMLCanvasElement with EXIF orientation and exact aspect ratio.
 */
export async function imageToCanvas(fileOrBlob: File | Blob): Promise<HTMLCanvasElement> {
  const decoded = await decodeImageSource(fileOrBlob);
  const canvas = document.createElement("canvas");
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    decoded.cleanup();
    throw new Error("Could not initialize canvas context.");
  }
  ctx.drawImage(decoded.source, 0, 0, decoded.width, decoded.height);
  decoded.cleanup();
  return canvas;
}

/**
 * Helper to convert canvas to JPEG Uint8Array.
 */
export async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
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

/**
 * Safely converts any image source (File, Blob, or Data URL) into JPG/PNG bytes
 * that can be directly passed to `pdfDoc.embedJpg` or `pdfDoc.embedPng`.
 */
export async function imageToPdfEmbeddable(
  source: File | Blob | string,
  quality = 0.92
): Promise<{ bytes: Uint8Array; format: "jpg" | "png"; width: number; height: number }> {
  let fileOrBlob: File | Blob;

  if (typeof source === "string") {
    const comma = source.indexOf(",");
    const meta = source.slice(0, comma);
    const base64 = comma !== -1 ? source.slice(comma + 1) : source;
    const isPng = meta.includes("image/png");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (isPng || meta.includes("image/jpeg") || meta.includes("image/jpg")) {
      const sig = detectFileSignature(bytes);
      if (sig.kind === "png") {
        const dims = parseImageDimensionsFromBytes(bytes);
        if (dims) return { bytes, format: "png", width: dims.width, height: dims.height };
      } else if (sig.kind === "jpeg") {
        const dims = parseImageDimensionsFromBytes(bytes);
        if (dims) return { bytes, format: "jpg", width: dims.width, height: dims.height };
      }
    }
    fileOrBlob = new Blob([bytes], { type: isPng ? "image/png" : "image/jpeg" });
  } else {
    fileOrBlob = source;
  }

  const canvas = await imageToCanvas(fileOrBlob);
  const width = canvas.width;
  const height = canvas.height;

  const isPng =
    (fileOrBlob.type === "image/png" ||
      ("name" in fileOrBlob && (fileOrBlob as File).name.toLowerCase().endsWith(".png"))) &&
    quality >= 0.95;

  let bytes: Uint8Array;
  let format: "jpg" | "png" = "jpg";

  if (isPng) {
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
      if (blob && blob.size > 0) {
        bytes = new Uint8Array(await blob.arrayBuffer());
        format = "png";
      } else {
        bytes = await canvasToJpeg(canvas, quality);
      }
    } catch {
      bytes = await canvasToJpeg(canvas, quality);
    }
  } else {
    bytes = await canvasToJpeg(canvas, quality);
  }

  canvas.width = 0;
  canvas.height = 0;

  return { bytes, format, width, height };
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
