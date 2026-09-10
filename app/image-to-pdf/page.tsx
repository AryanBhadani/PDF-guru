import { createPageMetadata } from "@/lib/metadata";
import { ImageToPdfClient } from "./image-to-pdf-client";

export const metadata = createPageMetadata(
  "Image to PDF Online",
  "Create a customized PDF from images with page size, margins, quality, and page numbers using PDF Guru.",
  "/image-to-pdf"
);

export default function ImageToPdfPage() {
  return <ImageToPdfClient />;
}
