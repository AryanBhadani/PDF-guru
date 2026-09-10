import { createPageMetadata } from "@/lib/metadata";
import { MaskDocumentClient } from "./mask-document-client";

export const metadata = createPageMetadata(
  "Aadhaar PAN Masking Tool",
  "Permanently mask Aadhaar, PAN, and other sensitive details in PDFs and images with PDF Guru.",
  "/mask-document"
);

export default function MaskDocumentPage() {
  return <MaskDocumentClient />;
}
