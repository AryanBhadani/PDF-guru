import { createPageMetadata } from "@/lib/metadata";
import { PdfToPptClient } from "./pdf-to-ppt-client";

export const metadata = createPageMetadata(
  "PDF to PPT Online",
  "Convert PDF pages into PowerPoint slides with PDF Guru. Each page becomes a slide.",
  "/pdf-to-ppt"
);

export default function PdfToPptPage() {
  return <PdfToPptClient />;
}
