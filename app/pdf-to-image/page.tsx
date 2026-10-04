import { createPageMetadata } from "@/lib/metadata";
import { PdfToImageClient } from "./pdf-to-image-client";

export const metadata = createPageMetadata(
  "PDF to Image Converter - Export PDF Pages as Images",
  "Convert PDF pages to PNG, JPG, or WEBP images. Download individual pages or all pages as a ZIP. High-quality conversion in your browser.",
  "/pdf-to-image"
);

export default function PdfToImagePage() {
  return <PdfToImageClient />;
}
