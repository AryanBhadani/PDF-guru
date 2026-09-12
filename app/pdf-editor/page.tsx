import { createPageMetadata } from "@/lib/metadata";
import { PdfEditorClient } from "./pdf-editor-client";

export const metadata = createPageMetadata(
  "PDF Editor Online",
  "Directly edit existing text, add images, delete content, and annotate PDFs online with PDF Guru.",
  "/pdf-editor"
);

export default function PdfEditorPage() {
  return <PdfEditorClient />;
}
