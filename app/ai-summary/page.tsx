import { createPageMetadata } from "@/lib/metadata";
import { AiSummaryClient } from "./ai-summary-client";

export const metadata = createPageMetadata(
  "AI PDF Summary",
  "Generate English and Hindi summaries of any PDF with PDF Guru.",
  "/ai-summary"
);

export default function AiSummaryPage() {
  return <AiSummaryClient />;
}
