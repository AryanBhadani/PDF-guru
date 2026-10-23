import { PDFDocument } from "pdf-lib";
import { canvasToBlob, loadPdfJsDocument, renderPageToCanvas, yieldToMain } from "@/lib/pdf-render";
import { loadPdf } from "@/lib/pdf";
import type { CompressLevel, CompressResult, ProgressCallback } from "@/types/conversion";

const LEVEL_SETTINGS: Record<CompressLevel, { scale: number; quality: number }> = {
  low: { scale: 1.6, quality: 0.82 },
  medium: { scale: 1.25, quality: 0.68 },
  high: { scale: 1, quality: 0.48 },
};

interface CompressionAttempt {
  scale: number;
  quality: number;
  grayscale: boolean;
}

export async function compressPdf(
  file: File,
  level: CompressLevel,
  targetBytes: number | null = null,
  onProgress?: ProgressCallback
): Promise<CompressResult> {
  const originalSize = file.size;
  const settings = LEVEL_SETTINGS[level];

  // If target size is specified, try to find optimal settings
  if (targetBytes && targetBytes < originalSize) {
    const result = await findOptimalCompression(file, targetBytes, onProgress);
    if (result) {
      return result;
    }
  }

  const rebuilt = await rebuildFromRenderedPages(file, settings.scale, settings.quality, false, onProgress);
  let fallback: Uint8Array | null = null;
  try {
    fallback = await recompressWithPdfLib(file);
  } catch {
    // pdf-lib fallback could not load the document directly, proceed with rebuilt pages
  }
  const chosen = fallback && fallback.byteLength < rebuilt.byteLength ? fallback : rebuilt;
  const compressedSize = chosen.byteLength;
  const reductionPercent =
    originalSize === 0 ? 0 : Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

  return {
    bytes: chosen,
    originalSize,
    compressedSize,
    reductionPercent,
    reduced: compressedSize < originalSize,
  };
}

async function recompressWithPdfLib(file: File): Promise<Uint8Array> {
  const pdf = await loadPdf(file);
  return pdf.save({ useObjectStreams: false, addDefaultPage: false });
}

async function rebuildFromRenderedPages(
  file: File,
  scale: number,
  quality: number,
  grayscale: boolean = false,
  onProgress?: ProgressCallback
): Promise<Uint8Array> {
  const source = await loadPdfJsDocument(file);
  const output = await PDFDocument.create();

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
    const page = await source.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = await renderPageToCanvas(page, scale);

    // Apply grayscale conversion if requested
    if (grayscale) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;     // R
          data[i + 1] = avg; // G
          data[i + 2] = avg; // B
        }
        ctx.putImageData(imageData, 0, 0);
      }
    }

    const blob = await canvasToBlob(canvas, "jpg", quality);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const image = await output.embedJpg(bytes);
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
  return output.save({ useObjectStreams: false });
}

async function findOptimalCompression(
  file: File,
  targetBytes: number,
  onProgress?: ProgressCallback
): Promise<CompressResult | null> {
  const originalSize = file.size;
  const targetRatio = targetBytes / originalSize;

  // Generate adaptive attempts based on how aggressive we need to be
  let attempts: CompressionAttempt[] = [];

  if (targetRatio < 0.1) {
    // Very aggressive: target is <10% of original (e.g., 5MB -> 500KB)
    attempts = [
      { scale: 0.3, quality: 0.1, grayscale: true },
      { scale: 0.4, quality: 0.15, grayscale: true },
      { scale: 0.5, quality: 0.2, grayscale: true },
      { scale: 0.6, quality: 0.25, grayscale: true },
      { scale: 0.7, quality: 0.3, grayscale: false },
      { scale: 0.8, quality: 0.35, grayscale: false },
      { scale: 0.9, quality: 0.4, grayscale: false },
      { scale: 1.0, quality: 0.45, grayscale: false },
    ];
  } else if (targetRatio < 0.25) {
    // Aggressive: target is <25% of original (e.g., 1MB -> 250KB)
    attempts = [
      { scale: 0.4, quality: 0.15, grayscale: true },
      { scale: 0.5, quality: 0.2, grayscale: true },
      { scale: 0.6, quality: 0.25, grayscale: true },
      { scale: 0.7, quality: 0.3, grayscale: false },
      { scale: 0.8, quality: 0.35, grayscale: false },
      { scale: 0.9, quality: 0.4, grayscale: false },
      { scale: 1.0, quality: 0.45, grayscale: false },
      { scale: 1.1, quality: 0.5, grayscale: false },
    ];
  } else if (targetRatio < 0.5) {
    // Moderate: target is <50% of original (e.g., 1MB -> 500KB)
    attempts = [
      { scale: 0.5, quality: 0.2, grayscale: true },
      { scale: 0.6, quality: 0.25, grayscale: true },
      { scale: 0.7, quality: 0.3, grayscale: false },
      { scale: 0.8, quality: 0.35, grayscale: false },
      { scale: 0.9, quality: 0.4, grayscale: false },
      { scale: 1.0, quality: 0.45, grayscale: false },
      { scale: 1.1, quality: 0.5, grayscale: false },
      { scale: 1.25, quality: 0.55, grayscale: false },
    ];
  } else {
    // Mild: target is >=50% of original
    attempts = [
      { scale: 0.7, quality: 0.3, grayscale: true },
      { scale: 0.8, quality: 0.35, grayscale: false },
      { scale: 0.9, quality: 0.4, grayscale: false },
      { scale: 1.0, quality: 0.45, grayscale: false },
      { scale: 1.1, quality: 0.5, grayscale: false },
      { scale: 1.25, quality: 0.55, grayscale: false },
      { scale: 1.4, quality: 0.6, grayscale: false },
      { scale: 1.6, quality: 0.68, grayscale: false },
    ];
  }

  let bestResult: Uint8Array | null = null;
  let bestSize = Infinity;

  for (const settings of attempts) {
    try {
      const compressed = await rebuildFromRenderedPages(file, settings.scale, settings.quality, settings.grayscale, onProgress);

      // Validate the PDF by attempting to load it
      try {
        await PDFDocument.load(compressed);
        // If we can load it, it's valid
      } catch (validationError) {
        console.warn("Generated PDF failed validation, skipping:", validationError);
        continue;
      }

      if (compressed.byteLength < bestSize) {
        bestResult = compressed;
        bestSize = compressed.byteLength;
      }

      // If we achieved the target, return immediately
      if (compressed.byteLength <= targetBytes) {
        const reductionPercent = Math.max(0, Math.round(((originalSize - compressed.byteLength) / originalSize) * 100));
        return {
          bytes: compressed,
          originalSize,
          compressedSize: compressed.byteLength,
          reductionPercent,
          reduced: compressed.byteLength < originalSize,
        };
      }
    } catch (error) {
      console.warn("Compression attempt failed:", error);
      continue;
    }
  }

  // Return the best result if we couldn't achieve the target
  if (bestResult) {
    const reductionPercent = Math.max(0, Math.round(((originalSize - bestResult.byteLength) / originalSize) * 100));
    return {
      bytes: bestResult,
      originalSize,
      compressedSize: bestResult.byteLength,
      reductionPercent,
      reduced: bestResult.byteLength < originalSize,
    };
  }

  return null;
}
