"use client";

import { useState } from "react";
import { Presentation } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { SelectedFile } from "@/components/pdf/selected-file";
import { PDF_MIME_TYPE } from "@/lib/constants";
import { getPdfPageCount } from "@/lib/pdf";
import { downloadBlob } from "@/lib/utils";
import { useT } from "@/components/i18n/language-provider";

export function PdfToPptClient() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      setFile(next);
      setPageCount(count);
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
      const { convertPdfToPptx } = await import("@/lib/pdf-to-ppt");
      const blob = await convertPdfToPptx(file, (current, total) => setProgress({ current, total }));
      const name = file.name.replace(/\.pdf$/i, "") || "pdf-guru";
      downloadBlob(blob, `${name}.pptx`);
      toast.success(t("success.pptReady"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.conversion"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout title={t("tools.pdfToPpt.pageTitle")} description={t("tools.pdfToPpt.pageDesc")}>
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
            icon={<Presentation className="h-8 w-8" />}
            title={t("tools.pdfToPpt.emptyTitle")}
            hint={t("tools.pdfToPpt.emptyHint")}
          />
        ) : (
          <>
            <SelectedFile
              name={file.name}
              size={file.size}
              extra={`${pageCount} ${t("common.pages")}`}
              disabled={loading}
              onClear={() => {
                setFile(null);
                setPageCount(0);
              }}
            />
            {loading && (
              <ProgressBar current={progress.current} total={progress.total} label={t("tools.pdfToPpt.progress")} />
            )}
            <DownloadButton
              label={t("tools.pdfToPpt.convert")}
              loadingLabel={t("tools.pdfToPpt.converting")}
              loading={loading}
              onClick={convert}
            />
          </>
        )}
      </div>
    </PdfToolLayout>
  );
}
