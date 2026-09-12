import { createPageMetadata } from "@/lib/metadata";
import { ScreenshotEditorClient } from "./screenshot-editor-client";

export const metadata = createPageMetadata(
  "Screenshot Editor",
  "Edit text directly in screenshots, modify content, annotate, and export as PDF with PDF Guru.",
  "/screenshot-editor"
);

export default function ScreenshotEditorPage() {
  return <ScreenshotEditorClient />;
}
