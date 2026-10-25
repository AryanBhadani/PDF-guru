import { createPageMetadata } from "@/lib/metadata";
import { ReaderClient } from "./reader-client";

export const metadata = createPageMetadata(
  "PDF Reader Online – View PDFs in Your Browser",
  "Open and read PDF files directly in your browser with continuous scroll, page navigation, and zoom controls. No downloads or plugins needed.",
  "/reader"
);

export default function ReaderPage({
  searchParams,
}: {
  searchParams: { file?: string };
}) {
  return <ReaderClient fileUrl={searchParams.file} />;
}
