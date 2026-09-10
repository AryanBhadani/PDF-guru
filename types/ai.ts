export type PdfSummary = {
  english: string;
  hindi: string;
};

export type SummaryRequest = {
  fileName: string;
  pageCount: number;
  sizeBytes: number;
};
