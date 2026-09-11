import { createPageMetadata } from "@/lib/metadata";
import { ScreenshotToWordClient } from "./screenshot-to-word-client";

export const metadata = createPageMetadata(
  "Screenshot to Word",
  "Turn website, app, and document screenshots into an editable Word file with PDF Guru.",
  "/screenshot-to-word"
);

export default function ScreenshotToWordPage() {
  return <ScreenshotToWordClient />;
}
