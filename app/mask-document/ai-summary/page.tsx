import { createPageMetadata } from "@/lib/metadata";
import { ComingSoon } from "@/components/pdf/coming-soon";
import { Sparkles } from "lucide-react";

export const metadata = createPageMetadata(
  "AI PDF Summary",
  "Generate English and Hindi summaries of any PDF with PDF Guru.",
  "/mask-document/ai-summary"
);

export default function AiSummaryPage() {
  return (
    <ComingSoon
      title="AI PDF Summary"
      description="Upload a PDF and get English and Hindi summaries. Processing stays in the browser for Phase 1."
      message="We are working on bringing AI-powered PDF summaries to PDF Guru. This feature will be available soon with support for English and Hindi."
      icon={Sparkles}
    />
  );
}
