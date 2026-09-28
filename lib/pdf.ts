import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { downloadBlob } from "@/lib/utils";
import { sanitizePdfBytes } from "@/lib/file-type";
import { loadPdfJsDocument, friendlyPdfError } from "@/lib/pdf-render";
import type { SplitRange } from "@/types/pdf";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function loadPdf(
  fileOrBytes: File | Blob | ArrayBuffer | Uint8Array
): Promise<PDFDocument> {
  let rawBytes: Uint8Array;
  if (fileOrBytes instanceof Uint8Array) {
    rawBytes = fileOrBytes;
  } else if (fileOrBytes instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(fileOrBytes);
  } else {
    rawBytes = new Uint8Array(await fileOrBytes.arrayBuffer());
  }

  const cleanBytes = sanitizePdfBytes(rawBytes);

  try {
    return await PDFDocument.load(cleanBytes, { ignoreEncryption: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("encrypt") || message.includes("password")) {
      throw new Error("This PDF is password-protected and cannot be opened.");
    }
    throw new Error("This PDF is invalid or corrupt.");
  }
}

export async function getPdfPageCount(
  fileOrBytes: File | Blob | ArrayBuffer | Uint8Array
): Promise<number> {
  // Try pdf-lib first
  try {
    const pdf = await loadPdf(fileOrBytes);
    return pdf.getPageCount();
  } catch (pdfLibError) {
    // Fallback to pdfjs-dist which is more forgiving of non-standard xrefs / PDF structures
    try {
      const doc = await loadPdfJsDocument(fileOrBytes);
      const count = doc.numPages;
      await doc.destroy();
      return count;
    } catch {
      throw friendlyPdfError(pdfLibError);
    }
  }
}

export async function validatePdfFile(
  fileOrBytes: File | Blob
): Promise<{ valid: boolean; pageCount?: number; error?: string }> {
  try {
    const pageCount = await getPdfPageCount(fileOrBytes);
    return { valid: true, pageCount };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "This PDF is invalid or corrupt.",
    };
  }
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("Upload at least one PDF to merge.");
  }

  const merged = await PDFDocument.create();

  for (const file of files) {
    const source = await loadPdf(file);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  return merged.save({ useObjectStreams: false });
}

export function parseSplitRanges(input: string, pageCount: number): SplitRange[] {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter at least one page range, for example 1-3, 5, 7-9.");
  }

  const tokens = trimmed.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error("Enter at least one page range, for example 1-3, 5, 7-9.");
  }

  const ranges: SplitRange[] = [];

  for (const token of tokens) {
    if (!/^(\d+)(?:\s*-\s*(\d+))?$/.test(token)) {
      throw new Error(`Invalid range syntax: "${token}". Use formats like 1-3 or 5.`);
    }

    const [startRaw, endRaw] = token.split("-").map((part) => part.trim());
    const start = Number(startRaw);
    const end = endRaw === undefined ? start : Number(endRaw);

    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new Error(`Invalid page numbers in "${token}".`);
    }
    if (start < 1 || end < 1) {
      throw new Error("Page numbers start at 1.");
    }
    if (start > pageCount || end > pageCount) {
      throw new Error(`Page ${Math.max(start, end)} is outside this ${pageCount}-page PDF.`);
    }
    if (start > end) {
      throw new Error(`Range "${token}" is reversed. Use ${end}-${start} instead.`);
    }

    ranges.push({ start, end });
  }

  return ranges;
}

export async function extractRanges(file: File, ranges: SplitRange[]): Promise<Uint8Array[]> {
  const source = await loadPdf(file);
  const outputs: Uint8Array[] = [];

  for (const range of ranges) {
    const extracted = await PDFDocument.create();
    const indices = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start - 1 + i
    );
    const pages = await extracted.copyPages(source, indices);
    pages.forEach((page) => extracted.addPage(page));
    outputs.push(await extracted.save({ useObjectStreams: false }));
  }

  return outputs;
}

export async function extractAllPages(file: File): Promise<Uint8Array[]> {
  const source = await loadPdf(file);
  const pageCount = source.getPageCount();
  const outputs: Uint8Array[] = [];

  for (let i = 0; i < pageCount; i += 1) {
    const extracted = await PDFDocument.create();
    const [page] = await extracted.copyPages(source, [i]);
    extracted.addPage(page);
    outputs.push(await extracted.save({ useObjectStreams: false }));
  }

  return outputs;
}

export async function zipPdfs(
  parts: Array<{ name: string; bytes: Uint8Array }>
): Promise<Blob> {
  const zip = new JSZip();
  parts.forEach((part) => zip.file(part.name, part.bytes));
  return zip.generateAsync({ type: "blob" });
}

export function pdfBytesToBlob(bytes: Uint8Array): Blob {
  const copy = bytes.slice(0);
  return new Blob([copy], { type: "application/pdf" });
}

export function downloadPdf(bytes: Uint8Array, filename: string): void {
  downloadBlob(pdfBytesToBlob(bytes), filename);
}

export function rangeLabel(range: SplitRange): string {
  return range.start === range.end ? `page-${range.start}` : `pages-${range.start}-${range.end}`;
}
