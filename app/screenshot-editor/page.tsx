import { createPageMetadata } from "@/lib/metadata";
import { ComingSoon } from "@/components/pdf/coming-soon";
import { ScanText } from "lucide-react";

export const metadata = createPageMetadata(
  "Screenshot Editor - Edit Screenshot Text and Export as PDF",
  "Edit text in screenshots, add annotations, modify content, and export as crisp PDF. OCR detects text for in-place editing. All processing in your browser.",
  "/screenshot-editor"
);

export default function ScreenshotEditorPage() {
  return (
    <ComingSoon
      title="Screenshot Editor"
      description="Edit text in screenshots, add annotations, modify content, and export as crisp PDF. OCR detects text for in-place editing. All processing in your browser."
      message="We are working on bringing the Screenshot Editor feature to PDF Guru. This tool will allow you to edit text in screenshots, add annotations, modify content, and export as crisp PDF using OCR."
      icon={ScanText}
    />
  );
}
