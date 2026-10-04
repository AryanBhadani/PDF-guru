import { createPageMetadata } from "@/lib/metadata";
import { ScreenshotEditorClient } from "./screenshot-editor-client";

export const metadata = createPageMetadata(
  "Screenshot Editor - Edit Screenshot Text and Export as PDF",
  "Edit text in screenshots, add annotations, modify content, and export as crisp PDF. OCR detects text for in-place editing. All processing in your browser.",
  "/screenshot-editor"
);

export default function ScreenshotEditorPage() {
  return <ScreenshotEditorClient />;
}
