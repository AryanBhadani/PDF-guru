import { createPageMetadata } from "@/lib/metadata";
import { MergePdfClient } from "./merge-pdf-client";

export const metadata = createPageMetadata(
  "Merge PDF Online - Combine Multiple PDFs Free",
  "Merge multiple PDF files into one document in any order. Combine PDFs quickly and securely in your browser with no server uploads.",
  "/merge-pdf"
);

export default function MergePdfPage() {
  return <MergePdfClient />;
}
