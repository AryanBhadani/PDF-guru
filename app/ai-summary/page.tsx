import { createPageMetadata } from "@/lib/metadata";
import { AiSummaryClient } from "./ai-summary-client";

export const metadata = createPageMetadata(
  "AI PDF Summary - Summarize PDF Documents Free",
  "Generate English and Hindi summaries of any PDF in seconds. Extract key points and insights from documents using AI. Processing stays in your browser.",
  "/ai-summary"
);

export default function AiSummaryPage() {
  return <AiSummaryClient />;
}
