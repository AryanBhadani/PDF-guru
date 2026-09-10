import JSZip from "jszip";
import { renderPdfPages } from "@/lib/pdf-render";
import type { ImageOutputFormat, ProgressCallback } from "@/types/conversion";

export const IMAGE_QUALITY_PRESETS = {
  low: 0.55,
  medium: 0.8,
  high: 0.92,
} as const;

export async function convertPdfToImages(
  file: File,
  options: {
    format: ImageOutputFormat;
    quality: keyof typeof IMAGE_QUALITY_PRESETS;
    onProgress?: ProgressCallback;
  }
) {
  const scale = options.quality === "high" ? 2 : options.quality === "medium" ? 1.5 : 1.15;
  return renderPdfPages(file, {
    scale,
    format: options.format,
    quality: IMAGE_QUALITY_PRESETS[options.quality],
    onProgress: options.onProgress,
  });
}

export async function zipImages(
  parts: Array<{ name: string; blob: Blob }>
): Promise<Blob> {
  const zip = new JSZip();
  for (const part of parts) {
    zip.file(part.name, part.blob);
  }
  return zip.generateAsync({ type: "blob" });
}

export function imageFileName(sourceName: string, pageNumber: number, format: ImageOutputFormat): string {
  const base = sourceName.replace(/\.pdf$/i, "") || "pdf-guru";
  return `${base}-page-${pageNumber}.${format === "jpg" ? "jpg" : format}`;
}
