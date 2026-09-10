"use client";

import { useState } from "react";
import { Copy, FileText, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { EmptyState } from "@/components/pdf/empty-state";
import { LoadingState } from "@/components/pdf/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PDF_MIME_TYPE } from "@/lib/constants";
import { summarizePdf } from "@/lib/ai-summary";
import { getPdfPageCount } from "@/lib/pdf";
import { formatFileSize } from "@/lib/utils";
import type { PdfSummary } from "@/types/ai";

export function AiSummaryClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PdfSummary | null>(null);

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      setFile(next);
      setPageCount(count);
      setSummary(null);
      toast.success("PDF loaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this PDF.");
    }
  };

  const generate = async () => {
    if (!file) {
      toast.error("Upload a PDF first.");
      return;
    }
    setLoading(true);
    try {
      const result = await summarizePdf({
        fileName: file.name,
        pageCount,
        sizeBytes: file.size,
      });
      setSummary(result);
      toast.success("Summary ready.");
    } catch {
      toast.error("Could not generate a summary.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy text.");
    }
  };

  return (
    <PdfToolLayout
      title="AI PDF Summary"
      description="Upload a PDF and get English and Hindi summaries. Processing stays in the browser for Phase 1."
    >
      <div className="space-y-6">
        <FileUpload
          accept="application/pdf,.pdf"
          multiple={false}
          title="Drop a PDF to summarize"
          hint="One PDF · summaries are generated locally in this mock"
          disabled={loading}
          allowedTypes={[PDF_MIME_TYPE]}
          onFiles={handleFiles}
        />

        {!file ? (
          <EmptyState
            icon={<Sparkles className="h-8 w-8" />}
            title="No PDF selected"
            hint="Upload a document to generate summaries."
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} · {pageCount} page{pageCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Button size="lg" disabled={loading} onClick={generate}>
                {summary ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {summary ? "Regenerate" : "Generate summary"}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && <LoadingState message="Writing English and Hindi summaries…" />}

        {summary && !loading && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryCard
              title="English"
              text={summary.english}
              onCopy={() => copy(summary.english, "English summary")}
            />
            <SummaryCard
              title="Hindi"
              text={summary.hindi}
              onCopy={() => copy(summary.hindi, "Hindi summary")}
            />
          </div>
        )}
      </div>
    </PdfToolLayout>
  );
}

function SummaryCard({ title, text, onCopy }: { title: string; text: string; onCopy: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">{text}</pre>
      </CardContent>
    </Card>
  );
}
