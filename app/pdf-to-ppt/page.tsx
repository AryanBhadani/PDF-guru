import { createPageMetadata } from "@/lib/metadata";
import { PdfToPptClient } from "./pdf-to-ppt-client";

export const metadata = createPageMetadata(
  "PDF to PPT Online - Convert PDF to PowerPoint",
  "Convert PDF pages to PowerPoint slides. Each PDF page becomes a PPT slide. Free conversion runs entirely in your browser.",
  "/pdf-to-ppt"
);

export default function PdfToPptPage() {
  return <PdfToPptClient />;
}
