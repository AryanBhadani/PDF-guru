import { createPageMetadata } from "@/lib/metadata";
import { PhotoToPdfClient } from "./photo-to-pdf-client";

export const metadata = createPageMetadata(
  "Photo to PDF Online",
  "Convert JPG, JPEG, PNG, and WEBP images into a high-quality PDF with PDF Guru.",
  "/photo-to-pdf"
);

export default function PhotoToPdfPage() {
  return <PhotoToPdfClient />;
}
