import { createPageMetadata } from "@/lib/metadata";
import { MergePdfClient } from "./merge-pdf-client";

export const metadata = createPageMetadata(
  "Merge PDF Online",
  "Combine multiple PDF files into one document with PDF Guru.",
  "/merge-pdf"
);

export default function MergePdfPage() {
  return <MergePdfClient />;
}
