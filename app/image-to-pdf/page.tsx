import { createPageMetadata } from "@/lib/metadata";
import { ImageToPdfClient } from "./image-to-pdf-client";

export const metadata = createPageMetadata(
  "Image to PDF Online - Advanced Photo to PDF Converter",
  "Create customized PDFs from images with page size, margins, quality, and page numbers. Convert JPG, PNG, WEBP, and HEIC to PDF in your browser.",
  "/image-to-pdf"
);

export default function ImageToPdfPage() {
  return <ImageToPdfClient />;
}
