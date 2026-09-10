import { createPageMetadata } from "@/lib/metadata";
import { CompressPdfClient } from "./compress-pdf-client";

export const metadata = createPageMetadata(
  "Compress PDF Online",
  "Reduce PDF file size with low, medium, or high compression using PDF Guru.",
  "/compress-pdf"
);

export default function CompressPdfPage() {
  return <CompressPdfClient />;
}
