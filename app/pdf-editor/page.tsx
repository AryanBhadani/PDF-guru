import { createPageMetadata } from "@/lib/metadata";
import { PdfEditorClient } from "./pdf-editor-client";

export const metadata = createPageMetadata(
  "PDF Editor Online - Edit PDF Text and Images Free",
  "Edit text directly in PDFs, add images, erase content, and annotate documents. All processing happens in your browser for maximum privacy.",
  "/pdf-editor"
);

export default function PdfEditorPage() {
  return <PdfEditorClient />;
}
