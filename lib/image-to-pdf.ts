import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { ImageToPdfOptions } from "@/types/conversion";

const MM_TO_PT = 2.834645669;

const PAGE_SIZES: Record<Exclude<ImageToPdfOptions["pageSize"], "custom" | "original">, [number, number]> = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
};

const MARGIN_PT: Record<Exclude<ImageToPdfOptions["margin"], "custom">, number> = {
  none: 0,
  small: 18,
  medium: 36,
  large: 54,
};

const QUALITY: Record<ImageToPdfOptions["quality"], number> = {
  low: 0.52,
  medium: 0.78,
  high: 0.92,
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized, 16);
  if (Number.isNaN(value)) return { r: 1, g: 1, b: 1 };
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

async function prepareImageBytes(file: File, quality: number): Promise<{ bytes: Uint8Array; width: number; height: number; kind: "jpg" | "png" }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(`Could not read image "${file.name}".`);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  const usePng = file.type === "image/png" && quality >= 0.9;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error(`Could not process "${file.name}".`));
      },
      usePng ? "image/png" : "image/jpeg",
      quality
    );
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const width = canvas.width;
  const height = canvas.height;
  canvas.width = 0;
  canvas.height = 0;
  return { bytes, width, height, kind: usePng ? "png" : "jpg" };
}

function pageDimensions(options: ImageToPdfOptions, imageWidth: number, imageHeight: number): [number, number] {
  if (options.pageSize === "custom") {
    const width = Math.max(120, options.customWidthMm * MM_TO_PT);
    const height = Math.max(120, options.customHeightMm * MM_TO_PT);
    return options.orientation === "landscape" ? [Math.max(width, height), Math.min(width, height)] : [width, height];
  }
  if (options.pageSize === "original") {
    return [imageWidth, imageHeight];
  }
  const [w, h] = PAGE_SIZES[options.pageSize];
  return options.orientation === "landscape" ? [Math.max(w, h), Math.min(w, h)] : [Math.min(w, h), Math.max(w, h)];
}

function marginPt(options: ImageToPdfOptions): number {
  if (options.margin === "custom") return Math.max(0, options.customMarginMm * MM_TO_PT);
  return MARGIN_PT[options.margin];
}

export async function createAdvancedImagePdf(files: File[], options: ImageToPdfOptions): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("Upload at least one image.");
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bg = hexToRgb(options.background || "#ffffff");
  const quality = QUALITY[options.quality];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const prepared = await prepareImageBytes(file, quality);
    const image =
      prepared.kind === "png" ? await pdf.embedPng(prepared.bytes) : await pdf.embedJpg(prepared.bytes);
    const [pageWidth, pageHeight] = pageDimensions(options, image.width, image.height);
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(bg.r, bg.g, bg.b),
    });

    const margin = Math.min(marginPt(options), pageWidth / 4, pageHeight / 4);
    const boxWidth = Math.max(10, pageWidth - margin * 2);
    const boxHeight = Math.max(10, pageHeight - margin * 2 - (options.pageNumbers === "none" ? 0 : 16));
    const imageRatio = image.width / image.height;
    const boxRatio = boxWidth / boxHeight;

    let drawWidth = boxWidth;
    let drawHeight = boxHeight;

    if (options.fit === "fit" || options.fit === "original") {
      if (imageRatio > boxRatio) {
        drawWidth = boxWidth;
        drawHeight = boxWidth / imageRatio;
      } else {
        drawHeight = boxHeight;
        drawWidth = boxHeight * imageRatio;
      }
      if (options.fit === "original") {
        const scale = 72 / 96;
        const naturalW = image.width * scale;
        const naturalH = image.height * scale;
        if (naturalW <= boxWidth && naturalH <= boxHeight) {
          drawWidth = naturalW;
          drawHeight = naturalH;
        }
      }
    } else {
      if (imageRatio > boxRatio) {
        drawHeight = boxHeight;
        drawWidth = boxHeight * imageRatio;
      } else {
        drawWidth = boxWidth;
        drawHeight = boxWidth / imageRatio;
      }
    }

    const x = margin + (boxWidth - drawWidth) / 2;
    const y = margin + (options.pageNumbers === "none" ? 0 : 16) + (boxHeight - drawHeight) / 2;
    page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });

    if (options.pageNumbers !== "none") {
      const label = String(index + 1);
      const textWidth = font.widthOfTextAtSize(label, 10);
      const textX =
        options.pageNumbers === "bottom-center" ? (pageWidth - textWidth) / 2 : pageWidth - margin - textWidth;
      page.drawText(label, {
        x: Math.max(margin, textX),
        y: 10,
        size: 10,
        font,
        color: rgb(0.25, 0.25, 0.25),
      });
    }
  }

  return pdf.save({ useObjectStreams: false });
}
