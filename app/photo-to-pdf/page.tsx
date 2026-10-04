import { createPageMetadata } from "@/lib/metadata";
import { PhotoToPdfClient } from "./photo-to-pdf-client";

export const metadata = createPageMetadata(
  "Photo to PDF Online - Convert Images to PDF Free",
  "Convert JPG, PNG, WEBP, and HEIC images to PDF in seconds. Merge multiple photos, reorder pages, and download a high-quality PDF. No file uploads to servers.",
  "/photo-to-pdf"
);

export default function PhotoToPdfPage() {
  return <PhotoToPdfClient />;
}
