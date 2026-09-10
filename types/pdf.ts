export type PdfFileItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
};

export type ImageFileItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
};

export type SplitRange = {
  start: number;
  end: number;
};

export type PdfErrorCode =
  | "INVALID_TYPE"
  | "EMPTY"
  | "TOO_LARGE"
  | "TOO_MANY"
  | "CORRUPT_PDF"
  | "INVALID_RANGE"
  | "PROCESSING_FAILED";
