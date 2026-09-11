"use client";

import { useState } from "react";
import { FileType } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { SelectedFile } from "@/components/pdf/selected-file";
import { Card, CardContent } from "@/components/ui/card";
import { PDF_MIME_TYPE } from "@/lib/constants";
import { getPdfPageCount } from "@/lib/pdf";
import { downloadBlob } from "@/lib/utils";
import { useT } from "@/components/i18n/language-provider";
import type { PdfToWordResult } from "@/lib/pdf-to-word";

export function PdfToWordClient() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<PdfToWordResult | null>(null);

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      setFile(next);
      setPageCount(count);
      setResult(null);
      setProgress({ current: 0, total: 0 });
      toast.success(t("upload.loadedPages", { count }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.readPdf"));
    }
  };

  const convert = async () => {
    if (!file || loading) {
      if (!file) toast.error(t("errors.uploadPdfFirst"));
      return;
    }
    setLoading(true);
    setProgress({ current: 0, total: pageCount });
    try {
      const { convertPdfToDocx } = await import("@/lib/pdf-to-word");
      const next = await convertPdfToDocx(file, (current, total) => setProgress({ current, total }));
      setResult(next);
      const name = file.name.replace(/\.pdf$/i, "") || "pdf-guru";
      downloadBlob(next.blob, `${name}.docx`);
      toast.success(t("success.wordReady"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.conversion"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout title={t("tools.pdfToWord.pageTitle")} description={t("tools.pdfToWord.pageDesc")}>
      <div className="space-y-6">
        <FileUpload
          accept="application/pdf,.pdf"
          multiple={false}
          title={t("upload.dropPdf")}
          hint={t("upload.hintOnePdf")}
          disabled={loading}
          allowedTypes={[PDF_MIME_TYPE]}
          onFiles={handleFiles}
        />
        {!file ? (
          <EmptyState
            icon={<FileType className="h-8 w-8" />}
            title={t("tools.pdfToWord.emptyTitle")}
            hint={t("tools.pdfToWord.emptyHint")}
          />
        ) : (
          <>
            <SelectedFile name={file.name} size={file.size} extra={`${pageCount} ${t("common.pages")}`} />
            {loading && (
              <ProgressBar current={progress.current} total={progress.total || pageCount} label={t("tools.pdfToWord.converting")} />
            )}
            {result && (
              <Card>
                <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
                  <p>{t("tools.pdfToWord.chars", { count: result.charCount, pages: result.pageCount })}</p>
                  {(result.likelyScanned || result.usedOcr) && <p>{t("tools.pdfToWord.ocrWarning")}</p>}
                </CardContent>
              </Card>
            )}
          </>
        )}
        <DownloadButton
          label={t("tools.pdfToWord.convert")}
          loadingLabel={t("tools.pdfToWord.converting")}
          loading={loading}
          disabled={!file}
          onClick={convert}
        />
      </div>
    </PdfToolLayout>
  );
}
