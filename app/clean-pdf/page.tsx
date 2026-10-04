import { createPageMetadata } from "@/lib/metadata";
import { CleanPdfClient } from "./clean-pdf-client";

export const metadata = createPageMetadata(
  "Photo to Clean PDF - Scan and Enhance Documents",
  "Straighten, crop, and clean document photos into sharp PDFs. Remove shadows, adjust brightness and contrast, and export professional documents.",
  "/clean-pdf"
);

export default function CleanPdfPage() {
  return <CleanPdfClient />;
}
