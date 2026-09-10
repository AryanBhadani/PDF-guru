import { PDFDocument } from "pdf-lib";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 24;

function getImageMime(file: File): "jpeg" | "png" | "webp" {
  const type = file.type.toLowerCase();
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpeg";
}

async function fileToUint8Array(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

function fitImage(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return { width: width * ratio, height: height * ratio };
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("Upload at least one image.");
  }

  const pdf = await PDFDocument.create();
  const maxWidth = A4_WIDTH - MARGIN * 2;
  const maxHeight = A4_HEIGHT - MARGIN * 2;

  for (const file of files) {
    const bytes = await fileToUint8Array(file);
    const kind = getImageMime(file);
    let image;

    try {
      if (kind === "png") {
        image = await pdf.embedPng(bytes);
      } else if (kind === "webp") {
        image = await pdf.embedPng(await webpToPng(file));
      } else {
        image = await pdf.embedJpg(bytes);
      }
    } catch {
      throw new Error(`Could not read image "${file.name}". Try another file.`);
    }

    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const size = fitImage(image.width, image.height, maxWidth, maxHeight);
    const x = (A4_WIDTH - size.width) / 2;
    const y = (A4_HEIGHT - size.height) / 2;
    page.drawImage(image, { x, y, width: size.width, height: size.height });
  }

  return pdf.save({ useObjectStreams: false });
}

async function webpToPng(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not convert WEBP image.");
  }
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Could not convert WEBP image."));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}
