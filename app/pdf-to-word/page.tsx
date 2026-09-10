import { createPageMetadata } from "@/lib/metadata";
import { PdfToWordClient } from "./pdf-to-word-client";

export const metadata = createPageMetadata(
  "PDF to Word",
  "Extract text from a PDF into an editable Word document with PDF Guru.",
  "/pdf-to-word"
);

export default function PdfToWordPage() {
  return <PdfToWordClient />;
}
