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
import { useT } from "@/components/i18n/language-provider";

export function AiSummaryClient() {
  const t = useT();
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
      toast.success(t("upload.pdfLoaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.readPdf"));
    }
  };

  const generate = async () => {
    if (!file) {
      toast.error(t("errors.uploadPdfFirst"));
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
      toast.success(t("success.summaryReady"));
    } catch {
      toast.error(t("errors.processing"));
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("success.copied", { label }));
    } catch {
      toast.error(t("errors.copy"));
    }
  };

  return (
    <PdfToolLayout title={t("tools.aiSummary.pageTitle")} description={t("tools.aiSummary.pageDesc")}>
      <div className="space-y-6">
        <FileUpload
          accept="application/pdf,.pdf"
          multiple={false}
          title={t("tools.aiSummary.drop")}
          hint={t("tools.aiSummary.hint")}
          disabled={loading}
          allowedTypes={[PDF_MIME_TYPE]}
          onFiles={handleFiles}
        />

        {!file ? (
          <EmptyState
            icon={<Sparkles className="h-8 w-8" />}
            title={t("tools.aiSummary.emptyTitle")}
            hint={t("tools.aiSummary.emptyHint")}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} · {pageCount} {t("common.pages")}
                  </p>
                </div>
              </div>
              <Button size="lg" disabled={loading} onClick={generate}>
                {summary ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {summary ? t("common.regenerate") : t("tools.aiSummary.generate")}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && <LoadingState message={t("tools.aiSummary.writing")} />}

        {summary && !loading && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryCard
              title={t("tools.aiSummary.english")}
              text={summary.english}
              onCopy={() => copy(summary.english, t("tools.aiSummary.english"))}
            />
            <SummaryCard
              title={t("tools.aiSummary.hindi")}
              text={summary.hindi}
              onCopy={() => copy(summary.hindi, t("tools.aiSummary.hindi"))}
            />
          </div>
        )}
      </div>
    </PdfToolLayout>
  );
}

function SummaryCard({ title, text, onCopy }: { title: string; text: string; onCopy: () => void }) {
  const t = useT();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {t("common.copy")}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">{text}</pre>
      </CardContent>
    </Card>
  );
}
