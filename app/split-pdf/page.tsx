import { createPageMetadata } from "@/lib/metadata";
import { SplitPdfClient } from "./split-pdf-client";

export const metadata = createPageMetadata(
  "Split PDF Online - Extract Pages from PDF Free",
  "Extract specific page ranges or split every page into separate PDFs. Download individual pages or all pages as a ZIP. Process files locally in your browser.",
  "/split-pdf"
);

export default function SplitPdfPage() {
  return <SplitPdfClient />;
}
