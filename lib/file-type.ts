/**
 * Robust file type detection, magic byte signature matching,
 * and PDF stream sanitization across all tools.
 */

export type FileKind = "pdf" | "jpeg" | "png" | "webp" | "heic" | "gif" | "bmp" | "unknown";

export interface FileSignatureResult {
  kind: FileKind;
  mime: string;
  headerOffset: number;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]; // \x89PNG
const JPEG_SOI = [0xff, 0xd8];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // RIFF
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50]; // WEBP
const FTYP_MAGIC = [0x66, 0x74, 0x79, 0x70]; // ftyp
const GIF87_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]; // GIF87a
const GIF89_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // GIF89a
const BMP_MAGIC = [0x42, 0x4d]; // BM

const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
  "avif",
  "avis",
]);

function matchesAt(bytes: Uint8Array, pattern: number[], offset: number): boolean {
  if (offset + pattern.length > bytes.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (bytes[offset + i] !== pattern[i]) return false;
  }
  return true;
}

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  let str = "";
  const end = Math.min(bytes.length, start + length);
  for (let i = start; i < end; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str.toLowerCase();
}

/**
 * Inspect raw bytes to detect actual file type by signature (magic bytes).
 */
export function detectFileSignature(input: ArrayBuffer | Uint8Array): FileSignatureResult {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const maxScan = Math.min(bytes.length, 1024);

  // 1. PDF detection (spec allows %PDF- anywhere in first 1024 bytes)
  for (let i = 0; i <= maxScan - 5; i++) {
    if (matchesAt(bytes, PDF_MAGIC, i)) {
      return { kind: "pdf", mime: "application/pdf", headerOffset: i };
    }
  }

  // 2. JPEG detection (starts with FF D8, allow up to 16 bytes leading BOM/whitespace)
  for (let i = 0; i <= Math.min(bytes.length - 2, 16); i++) {
    if (bytes[i] === JPEG_SOI[0] && bytes[i + 1] === JPEG_SOI[1]) {
      return { kind: "jpeg", mime: "image/jpeg", headerOffset: i };
    }
  }

  // 3. PNG detection
  for (let i = 0; i <= Math.min(bytes.length - 4, 8); i++) {
    if (matchesAt(bytes, PNG_MAGIC, i)) {
      return { kind: "png", mime: "image/png", headerOffset: i };
    }
  }

  // 4. WEBP detection: RIFF at 0..4, WEBP at offset + 8
  for (let i = 0; i <= Math.min(bytes.length - 12, 8); i++) {
    if (matchesAt(bytes, RIFF_MAGIC, i) && matchesAt(bytes, WEBP_MAGIC, i + 8)) {
      return { kind: "webp", mime: "image/webp", headerOffset: i };
    }
  }

  // 5. HEIC / HEIF / AVIF (ISOBMFF format: ftyp at offset 4..8)
  for (let i = 0; i <= Math.min(bytes.length - 16, 16); i++) {
    if (matchesAt(bytes, FTYP_MAGIC, i + 4)) {
      const brand = readAscii(bytes, i + 8, 4);
      if (HEIC_BRANDS.has(brand)) {
        const mime = brand.startsWith("avi") ? "image/avif" : "image/heic";
        return { kind: "heic", mime, headerOffset: i };
      }
      // Check compatible brands
      const compCheckLen = Math.min(bytes.length - (i + 16), 32);
      for (let c = 0; c < compCheckLen; c += 4) {
        const compBrand = readAscii(bytes, i + 16 + c, 4);
        if (HEIC_BRANDS.has(compBrand)) {
          const mime = compBrand.startsWith("avi") ? "image/avif" : "image/heic";
          return { kind: "heic", mime, headerOffset: i };
        }
      }
    }
  }

  // 6. GIF
  if (matchesAt(bytes, GIF87_MAGIC, 0) || matchesAt(bytes, GIF89_MAGIC, 0)) {
    return { kind: "gif", mime: "image/gif", headerOffset: 0 };
  }

  // 7. BMP
  if (matchesAt(bytes, BMP_MAGIC, 0)) {
    return { kind: "bmp", mime: "image/bmp", headerOffset: 0 };
  }

  return { kind: "unknown", mime: "application/octet-stream", headerOffset: 0 };
}

/**
 * Ensures PDF bytes start cleanly at the %PDF- header,
 * stripping leading UTF-8 BOM, whitespace, or server junk.
 */
export function sanitizePdfBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const maxScan = Math.min(bytes.length, 1024);

  let headerIndex = -1;
  for (let i = 0; i <= maxScan - 5; i++) {
    if (matchesAt(bytes, PDF_MAGIC, i)) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex > 0) {
    // Return fresh slice starting at %PDF-
    return bytes.slice(headerIndex);
  }

  // Return clean copy to avoid detached buffer issues
  return bytes.slice(0);
}

/**
 * Read the first N bytes of a File or Blob without loading the whole file into memory.
 */
export async function readFileHeaderBytes(file: File | Blob, length = 1024): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Detect actual MIME type and file kind from bytes, falling back to name/type metadata.
 */
export async function detectFileType(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  fallbackName?: string,
  fallbackType?: string
): Promise<{ kind: FileKind; mime: string; isPdf: boolean; isImage: boolean }> {
  let headerBytes: Uint8Array;
  let filename = fallbackName || "";
  let declaredMime = fallbackType || "";

  if (fileOrBuffer instanceof File) {
    filename = filename || fileOrBuffer.name;
    declaredMime = declaredMime || fileOrBuffer.type;
    headerBytes = await readFileHeaderBytes(fileOrBuffer, 1024);
  } else if (fileOrBuffer instanceof Blob) {
    declaredMime = declaredMime || fileOrBuffer.type;
    headerBytes = await readFileHeaderBytes(fileOrBuffer, 1024);
  } else {
    headerBytes = fileOrBuffer instanceof Uint8Array ? fileOrBuffer : new Uint8Array(fileOrBuffer);
  }

  const sig = detectFileSignature(headerBytes);
  if (sig.kind !== "unknown") {
    return {
      kind: sig.kind,
      mime: sig.mime,
      isPdf: sig.kind === "pdf",
      isImage: sig.kind !== "pdf",
    };
  }

  // Fallback to declared MIME and filename extension
  const lowerName = filename.toLowerCase();
  const lowerType = declaredMime.toLowerCase();

  if (lowerType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return { kind: "pdf", mime: "application/pdf", isPdf: true, isImage: false };
  }
  if (
    lowerType.includes("jpeg") ||
    lowerType.includes("jpg") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".jfif") ||
    lowerName.endsWith(".pjpeg")
  ) {
    return { kind: "jpeg", mime: "image/jpeg", isPdf: false, isImage: true };
  }
  if (lowerType === "image/png" || lowerName.endsWith(".png")) {
    return { kind: "png", mime: "image/png", isPdf: false, isImage: true };
  }
  if (lowerType === "image/webp" || lowerName.endsWith(".webp")) {
    return { kind: "webp", mime: "image/webp", isPdf: false, isImage: true };
  }
  if (
    lowerType === "image/heic" ||
    lowerType === "image/heif" ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  ) {
    return { kind: "heic", mime: "image/heic", isPdf: false, isImage: true };
  }
  if (lowerType.startsWith("image/")) {
    return { kind: "unknown", mime: lowerType, isPdf: false, isImage: true };
  }

  return { kind: "unknown", mime: lowerType || "application/octet-stream", isPdf: false, isImage: false };
}

/**
 * Resilient check if file is a PDF. Never rejects a valid PDF because of missing/wrong extension or MIME.
 */
export async function isPdfFile(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  filename?: string
): Promise<boolean> {
  const info = await detectFileType(fileOrBuffer, filename);
  return info.isPdf;
}

/**
 * Resilient check if file is an image. Never rejects valid images from Android camera/gallery.
 */
export async function isImageFile(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  filename?: string
): Promise<boolean> {
  const info = await detectFileType(fileOrBuffer, filename);
  return info.isImage;
}

/**
 * Asynchronously verifies whether a file is accepted by `allowedTypes`.
 * When MIME type or extension is ambiguous, checks magic numbers.
 */
export async function isAllowedFile(file: File, allowedTypes?: string[]): Promise<boolean> {
  if (!allowedTypes || allowedTypes.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  // Fast check by MIME / extension
  for (const allowed of allowedTypes) {
    const normalized = allowed.toLowerCase();
    if (type && type === normalized) return true;
    if (normalized === "application/pdf" && (type === "application/pdf" || name.endsWith(".pdf"))) {
      return true;
    }
    if (normalized.startsWith("image/") || normalized === "image/*") {
      if (type.startsWith("image/")) return true;
      if (
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".png") ||
        name.endsWith(".webp") ||
        name.endsWith(".heic") ||
        name.endsWith(".heif") ||
        name.endsWith(".jfif") ||
        name.endsWith(".bmp") ||
        name.endsWith(".gif")
      ) {
        return true;
      }
    }
  }

  // If MIME or extension didn't match (e.g. Android gallery content stream, application/octet-stream),
  // check actual magic bytes.
  try {
    const detected = await detectFileType(file);
    for (const allowed of allowedTypes) {
      const normalized = allowed.toLowerCase();
      if (normalized === "application/pdf" && detected.isPdf) return true;
      if (
        (normalized.startsWith("image/") || normalized === "image/*") &&
        detected.isImage
      ) {
        return true;
      }
      if (detected.mime === normalized) return true;
    }
  } catch {
    // If reading failed, do not reject if filename has any plausible match
  }

  return false;
}

/**
 * Direct binary dimension extractor for JPEG, PNG, WEBP (used as Tier 4 fallback).
 */
export function parseImageDimensionsFromBytes(
  input: ArrayBuffer | Uint8Array
): { width: number; height: number } | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 16) return null;

  // 1. PNG: width and height are at byte 16..23 (IHDR chunk)
  if (matchesAt(bytes, PNG_MAGIC, 0) && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    if (width > 0 && height > 0) return { width, height };
  }

  // 2. JPEG: scan for SOF0 (0xFFC0), SOF1 (0xFFC1), SOF2 (0xFFC2)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    while (offset < bytes.length - 8) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      // SOF markers: C0, C1, C2, C3, C5, C6, C7, C9, CA, CB, CD, CE, CF
      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isSof && offset + 8 < bytes.length) {
        const height = view.getUint16(offset + 5, false);
        const width = view.getUint16(offset + 7, false);
        if (width > 0 && height > 0) return { width, height };
      }

      // Skip marker segment
      if (offset + 3 < bytes.length) {
        const length = view.getUint16(offset + 2, false);
        if (length < 2) break;
        offset += 2 + length;
      } else {
        break;
      }
    }
  }

  // 3. WEBP: VP8, VP8L, VP8X
  if (matchesAt(bytes, RIFF_MAGIC, 0) && matchesAt(bytes, WEBP_MAGIC, 8) && bytes.length >= 30) {
    const chunkType = readAscii(bytes, 12, 4);
    if (chunkType === "vp8 " && bytes.length >= 30) {
      // Lossy VP8
      const width = ((bytes[27] << 8) | bytes[26]) & 0x3fff;
      const height = ((bytes[29] << 8) | bytes[28]) & 0x3fff;
      if (width > 0 && height > 0) return { width, height };
    } else if (chunkType === "vp8l" && bytes.length >= 25) {
      // Lossless VP8L
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (width > 0 && height > 0) return { width, height };
    } else if (chunkType === "vp8x" && bytes.length >= 30) {
      // Extended VP8X
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      if (width > 0 && height > 0) return { width, height };
    }
  }

  return null;
}
