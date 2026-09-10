export type ImageOutputFormat = "png" | "jpg" | "webp";

export type CompressLevel = "low" | "medium" | "high";

export type PageSizeName = "a4" | "a3" | "a5" | "letter" | "legal" | "custom" | "original";

export type PageOrientation = "portrait" | "landscape";

export type MarginPreset = "none" | "small" | "medium" | "large" | "custom";

export type ImageFit = "fit" | "fill" | "original";

export type ImageQualityLevel = "low" | "medium" | "high";

export type PageNumberPosition = "none" | "bottom-center" | "bottom-right";

export type ProgressCallback = (current: number, total: number) => void;

export type RenderedPageImage = {
  pageNumber: number;
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

export type CompressResult = {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  reduced: boolean;
};

export type ImageToPdfOptions = {
  pageSize: PageSizeName;
  orientation: PageOrientation;
  customWidthMm: number;
  customHeightMm: number;
  margin: MarginPreset;
  customMarginMm: number;
  fit: ImageFit;
  quality: ImageQualityLevel;
  background: string;
  pageNumbers: PageNumberPosition;
};
