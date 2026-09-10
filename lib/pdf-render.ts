import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { ImageOutputFormat, ProgressCallback } from "@/types/conversion";

const WORKER_SRC = "/pdf.worker.min.mjs";

let workerReady = false;

export async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
    workerReady = true;
  }
  return pdfjs;
}

function friendlyPdfError(error: unknown): Error {
  if (error instanceof Error) {
    const name = error.name || "";
    const message = error.message || "";
    if (name === "PasswordException" || message.toLowerCase().includes("password")) {
      return new Error("This PDF is password-protected and cannot be opened.");
    }
    if (name === "InvalidPDFException" || message.toLowerCase().includes("invalid pdf")) {
      return new Error("This PDF is invalid or corrupt.");
    }
  }
  return new Error("Could not read this PDF.");
}

export async function loadPdfJsDocument(file: File): Promise<PDFDocumentProxy> {
  try {
    const pdfjs = await getPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    return await pdfjs.getDocument({ data, isEvalSupported: false, disableAutoFetch: true }).promise;
  } catch (error) {
    throw friendlyPdfError(error);
  }
}

export async function renderPageToCanvas(
  page: PDFPageProxy,
  scale = 1.5
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Could not render this page.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageOutputFormat,
  quality = 0.85
): Promise<Blob> {
  const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
          return;
        }
        if (format !== "png") {
          canvas.toBlob((fallback) => {
            if (fallback) resolve(fallback);
            else reject(new Error("Could not export this page as an image."));
          }, "image/png");
          return;
        }
        reject(new Error("Could not export this page as an image."));
      },
      mime,
      quality
    );
  });
}

export function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality = 0.85): string {
  return canvas.toDataURL("image/jpeg", quality);
}

export async function yieldToMain(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function renderPdfPages(
  file: File,
  options: {
    scale?: number;
    format?: ImageOutputFormat;
    quality?: number;
    onProgress?: ProgressCallback;
  } = {}
): Promise<Array<{ pageNumber: number; blob: Blob; width: number; height: number }>> {
  const pdf = await loadPdfJsDocument(file);
  const scale = options.scale ?? 1.5;
  const format = options.format ?? "png";
  const quality = options.quality ?? 0.85;
  const results: Array<{ pageNumber: number; blob: Blob; width: number; height: number }> = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const canvas = await renderPageToCanvas(page, scale);
    const blob = await canvasToBlob(canvas, format, quality);
    results.push({
      pageNumber,
      blob,
      width: canvas.width,
      height: canvas.height,
    });
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
    options.onProgress?.(pageNumber, pdf.numPages);
    await yieldToMain();
  }

  await pdf.destroy();
  return results;
}
