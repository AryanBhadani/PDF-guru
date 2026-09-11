import { PDFDocument } from "pdf-lib";
import type { PhotoPdfOptions, PhotoPdfQuality } from "@/types/conversion";

const A4_SHORT = 595.28;
const A4_LONG = 841.89;

const QUALITY_PRESET: Record<PhotoPdfQuality, { jpeg: number; maxDpi: number | null }> = {
  low: { jpeg: 0.62, maxDpi: 120 },
  medium: { jpeg: 0.84, maxDpi: 180 },
  high: { jpeg: 0.92, maxDpi: 240 },
  original: { jpeg: 0.95, maxDpi: null },
};

type PreparedPhoto = {
  bytes: Uint8Array;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
};

function pageSizeForPhoto(imageWidth: number, imageHeight: number): [number, number] {
  if (imageWidth >= imageHeight) {
    return [A4_LONG, A4_SHORT];
  }
  return [A4_SHORT, A4_LONG];
}

function shouldCover(imageRatio: number, pageRatio: number): boolean {
  const tallOrNarrow = imageRatio < 0.52 || imageRatio > 2.1;
  if (tallOrNarrow) return false;
  const mismatch = Math.abs(imageRatio - pageRatio) / pageRatio;
  return mismatch <= 0.2;
}

async function loadOrientedBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return createImageBitmap(file);
  }
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result && result.size > 0) resolve(result);
        else reject(new Error("Could not compress this image."));
      },
      "image/jpeg",
      quality
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function preparePhoto(file: File, quality: PhotoPdfQuality): Promise<PreparedPhoto> {
  const bitmap = await loadOrientedBitmap(file);
  const imageWidth = bitmap.width;
  const imageHeight = bitmap.height;
  if (imageWidth < 1 || imageHeight < 1) {
    bitmap.close?.();
    throw new Error(`Could not read image "${file.name}".`);
  }

  const [pageWidth, pageHeight] = pageSizeForPhoto(imageWidth, imageHeight);
  const imageRatio = imageWidth / imageHeight;
  const pageRatio = pageWidth / pageHeight;
  const cover = shouldCover(imageRatio, pageRatio);
  const margin = cover ? 0 : 10;
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = pageHeight - margin * 2;
  const boxRatio = boxWidth / boxHeight;

  let sx = 0;
  let sy = 0;
  let sw = imageWidth;
  let sh = imageHeight;
  let dw = boxWidth;
  let dh = boxHeight;

  if (cover) {
    if (imageRatio > boxRatio) {
      sw = imageHeight * boxRatio;
      sh = imageHeight;
      sx = (imageWidth - sw) / 2;
      sy = 0;
    } else {
      sw = imageWidth;
      sh = imageWidth / boxRatio;
      sx = 0;
      sy = (imageHeight - sh) / 2;
    }
  } else if (imageRatio > boxRatio) {
    dw = boxWidth;
    dh = boxWidth / imageRatio;
  } else {
    dh = boxHeight;
    dw = boxHeight * imageRatio;
  }

  const preset = QUALITY_PRESET[quality];
  const targetDpi = preset.maxDpi ?? Math.max(220, Math.min(300, (imageWidth / dw) * 72));
  const scale = Math.min(targetDpi / 72, imageWidth / sw, imageHeight / sh);
  const canvasWidth = Math.max(1, Math.round(dw * scale));
  const canvasHeight = Math.max(1, Math.round(dh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    bitmap.close?.();
    throw new Error(`Could not read image "${file.name}".`);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
  bitmap.close?.();

  const bytes = await canvasToJpeg(canvas, preset.jpeg);
  canvas.width = 0;
  canvas.height = 0;

  return { bytes, width: dw, height: dh, pageWidth, pageHeight };
}

export async function imagesToPdf(files: File[], options: PhotoPdfOptions = { quality: "medium" }): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("Upload at least one image.");
  }

  const pdf = await PDFDocument.create();
  const quality = options.quality ?? "medium";

  for (const file of files) {
    let prepared: PreparedPhoto;
    try {
      prepared = await preparePhoto(file, quality);
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error(`Could not read image "${file.name}". Try another file.`);
    }

    const image = await pdf.embedJpg(prepared.bytes);
    const page = pdf.addPage([prepared.pageWidth, prepared.pageHeight]);
    const x = (prepared.pageWidth - prepared.width) / 2;
    const y = (prepared.pageHeight - prepared.height) / 2;
    page.drawImage(image, {
      x,
      y,
      width: prepared.width,
      height: prepared.height,
    });
  }

  return pdf.save({ useObjectStreams: false });
}
