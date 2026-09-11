import { createPageMetadata } from "@/lib/metadata";
import { PdfToWordClient } from "./pdf-to-word-client";

export const metadata = createPageMetadata(
  "PDF to Word",
  "Convert PDFs into an editable Word document with layout, tables, and OCR using PDF Guru.",
  "/pdf-to-word"
);

export default function PdfToWordPage() {
  return <PdfToWordClient />;
}
