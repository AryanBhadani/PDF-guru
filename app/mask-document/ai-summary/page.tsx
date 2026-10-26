import { createPageMetadata } from "@/lib/metadata";
import { ComingSoon } from "@/components/pdf/coming-soon";

export const metadata = createPageMetadata(
  "AI PDF Summary",
  "Generate English and Hindi summaries of any PDF with PDF Guru.",
  "/ai-summary"
);

export default function AiSummaryPage() {
  return (
    <ComingSoon
      title="AI PDF Summary"
      description="Upload a PDF and get English and Hindi summaries. Processing stays in the browser for Phase 1."
    />
  );
}
