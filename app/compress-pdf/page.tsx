import { createPageMetadata } from "@/lib/metadata";
import { CompressPdfClient } from "./compress-pdf-client";

export const metadata = createPageMetadata(
  "Compress PDF Online - Reduce PDF File Size Free",
  "Reduce PDF file size with low, medium, or high compression. See actual size reduction before downloading. Compress PDFs securely in your browser.",
  "/compress-pdf"
);

export default function CompressPdfPage() {
  return <CompressPdfClient />;
}
