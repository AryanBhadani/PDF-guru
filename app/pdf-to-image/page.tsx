import { createPageMetadata } from "@/lib/metadata";
import { PdfToImageClient } from "./pdf-to-image-client";

export const metadata = createPageMetadata(
  "PDF to Image Converter",
  "Convert every PDF page into PNG, JPG, or WEBP images with PDF Guru.",
  "/pdf-to-image"
);

export default function PdfToImagePage() {
  return <PdfToImageClient />;
}
