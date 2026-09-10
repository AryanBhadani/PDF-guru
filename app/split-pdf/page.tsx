import { createPageMetadata } from "@/lib/metadata";
import { SplitPdfClient } from "./split-pdf-client";

export const metadata = createPageMetadata(
  "Split PDF Online",
  "Extract page ranges or save every page as its own PDF with PDF Guru.",
  "/split-pdf"
);

export default function SplitPdfPage() {
  return <SplitPdfClient />;
}
