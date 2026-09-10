import { createPageMetadata } from "@/lib/metadata";
import { CleanPdfClient } from "./clean-pdf-client";

export const metadata = createPageMetadata(
  "Photo to Clean PDF",
  "Straighten, crop, and clean document photos into a sharp PDF with PDF Guru.",
  "/clean-pdf"
);

export default function CleanPdfPage() {
  return <CleanPdfClient />;
}
