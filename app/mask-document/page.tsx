import { createPageMetadata } from "@/lib/metadata";
import { MaskDocumentClient } from "./mask-document-client";

export const metadata = createPageMetadata(
  "Aadhaar PAN Masking Tool - Hide Sensitive Details in PDF",
  "Permanently mask Aadhaar, PAN, and other sensitive details in PDFs and images. Draw black boxes over private information. Verify before sharing.",
  "/mask-document"
);

export default function MaskDocumentPage() {
  return <MaskDocumentClient />;
}
