import { createPageMetadata } from "@/lib/metadata";
import { ComingSoon } from "@/components/pdf/coming-soon";
import { ShieldOff } from "lucide-react";

export const metadata = createPageMetadata(
  "Aadhaar PAN Masking Tool - Hide Sensitive Details in PDF",
  "Permanently mask Aadhaar, PAN, and other sensitive details in PDFs and images. Draw black boxes over private information. Verify before sharing.",
  "/mask-document"
);

export default function MaskDocumentPage() {
  return (
    <ComingSoon
      title="Mask Document"
      description="Permanently mask Aadhaar, PAN, and other sensitive details in PDFs and images. Draw black boxes over private information. Verify before sharing."
      message="We are working on bringing the Mask Document feature to PDF Guru. This tool will allow you to permanently hide sensitive details like Aadhaar and PAN numbers in PDFs and images."
      icon={ShieldOff}
    />
  );
}
