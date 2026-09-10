import { PDFDocument } from "pdf-lib";
import { canvasToBlob, loadPdfJsDocument, renderPageToCanvas, yieldToMain } from "@/lib/pdf-render";
import { loadPdf } from "@/lib/pdf";
import type { CompressLevel, CompressResult, ProgressCallback } from "@/types/conversion";

const LEVEL_SETTINGS: Record<CompressLevel, { scale: number; quality: number }> = {
  low: { scale: 1.6, quality: 0.82 },
  medium: { scale: 1.25, quality: 0.68 },
  high: { scale: 1, quality: 0.48 },
};

export async function compressPdf(
  file: File,
  level: CompressLevel,
  onProgress?: ProgressCallback
): Promise<CompressResult> {
  const originalSize = file.size;
  const settings = LEVEL_SETTINGS[level];

  const rebuilt = await rebuildFromRenderedPages(file, settings.scale, settings.quality, onProgress);
  const fallback = await recompressWithPdfLib(file);
  const chosen = rebuilt.byteLength <= fallback.byteLength ? rebuilt : fallback;
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
  return pdf.save({ useObjectStreams: true, addDefaultPage: false });
}

async function rebuildFromRenderedPages(
  file: File,
  scale: number,
  quality: number,
  onProgress?: ProgressCallback
): Promise<Uint8Array> {
  const source = await loadPdfJsDocument(file);
  const output = await PDFDocument.create();

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
    const page = await source.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = await renderPageToCanvas(page, scale);
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
  return output.save({ useObjectStreams: true });
}
