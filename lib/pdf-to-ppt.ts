import { canvasToBlob, loadPdfJsDocument, renderPageToCanvas, yieldToMain } from "@/lib/pdf-render";
import { buildPptxFromJpegs } from "@/lib/pptx";
import type { ProgressCallback } from "@/types/conversion";

export async function convertPdfToPptx(
  file: File,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const pdf = await loadPdfJsDocument(file);
  const firstPage = await pdf.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1 });
  firstPage.cleanup();

  const images: Array<{ bytes: Uint8Array }> = [];
  let widthPx = firstViewport.width;
  let heightPx = firstViewport.height;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, 1800 / Math.max(viewport.width, viewport.height));
    const canvas = await renderPageToCanvas(page, scale);
    if (pageNumber === 1) {
      widthPx = canvas.width;
      heightPx = canvas.height;
    }
    const blob = await canvasToBlob(canvas, "jpg", 0.84);
    images.push({ bytes: new Uint8Array(await blob.arrayBuffer()) });
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
    onProgress?.(pageNumber, pdf.numPages);
    await yieldToMain();
  }

  await pdf.destroy();

  return buildPptxFromJpegs(images, {
    title: file.name.replace(/\.pdf$/i, "") || "PDF Guru",
    widthPx,
    heightPx,
  });
}
