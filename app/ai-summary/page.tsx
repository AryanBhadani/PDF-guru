import { createPageMetadata } from "@/lib/metadata";
import { ComingSoon } from "@/components/pdf/coming-soon";
import { Sparkles } from "lucide-react";

export const metadata = createPageMetadata(
  "AI PDF Summary - Summarize PDF Documents Free",
  "Generate English and Hindi summaries of any PDF in seconds. Extract key points and insights from documents using AI. Processing stays in your browser.",
  "/ai-summary"
);

export default function AiSummaryPage() {
  return (
    <ComingSoon
      title="AI PDF Summary"
      description="Generate English and Hindi summaries of any PDF in seconds. Extract key points and insights from documents using AI. Processing stays in your browser."
      message="We are working on bringing AI-powered PDF summaries to PDF Guru. This feature will be available soon with support for English and Hindi."
      icon={Sparkles}
    />
  );
}
