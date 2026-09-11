"use client";

import { useState } from "react";
import { Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { SelectedFile } from "@/components/pdf/selected-file";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { PDF_MIME_TYPE } from "@/lib/constants";
import { downloadPdf, getPdfPageCount } from "@/lib/pdf";
import { formatFileSize } from "@/lib/utils";
import type { CompressLevel, CompressResult } from "@/types/conversion";
import { useT } from "@/components/i18n/language-provider";

export function CompressPdfClient() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [level, setLevel] = useState<CompressLevel>("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<CompressResult | null>(null);

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      setFile(next);
      setPageCount(count);
      setResult(null);
      toast.success(t("upload.pdfLoaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.readPdf"));
    }
  };

  const compress = async () => {
    if (!file || loading) {
      if (!file) toast.error(t("errors.uploadPdfFirst"));
      return;
    }
    setLoading(true);
    setResult(null);
    setProgress({ current: 0, total: pageCount });
    try {
      const { compressPdf } = await import("@/lib/pdf-compress");
      const next = await compressPdf(file, level, (current, total) => setProgress({ current, total }));
      setResult(next);
      if (next.reduced) {
        toast.success(t("success.compressed", { percent: next.reductionPercent }));
      } else {
        toast.message(t("tools.compressPdf.notReduced"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.processing"));
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const name = file?.name.replace(/\.pdf$/i, "") || "pdf-guru";
    downloadPdf(result.bytes, `${name}-compressed.pdf`);
  };

  return (
    <PdfToolLayout title={t("tools.compressPdf.pageTitle")} description={t("tools.compressPdf.pageDesc")}>
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
            icon={<Minimize2 className="h-8 w-8" />}
            title={t("tools.compressPdf.emptyTitle")}
            hint={t("tools.compressPdf.emptyHint")}
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
                setResult(null);
              }}
            />
            <div className="grid gap-2 max-w-md">
              <Label htmlFor="level">{t("tools.compressPdf.level")}</Label>
              <NativeSelect
                id="level"
                value={level}
                disabled={loading}
                onChange={(event) => setLevel(event.target.value as CompressLevel)}
              >
                <option value="low">{t("tools.compressPdf.low")}</option>
                <option value="medium">{t("tools.compressPdf.medium")}</option>
                <option value="high">{t("tools.compressPdf.high")}</option>
              </NativeSelect>
            </div>
            {loading && <ProgressBar current={progress.current} total={progress.total} label={t("tools.compressPdf.converting")} />}
            <DownloadButton
              label={t("tools.compressPdf.convert")}
              loadingLabel={t("tools.compressPdf.converting")}
              loading={loading}
              onClick={compress}
            />
          </>
        )}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>{t("tools.compressPdf.result")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{t("tools.compressPdf.originalSize", { size: formatFileSize(result.originalSize) })}</p>
              <p>{t("tools.compressPdf.compressedSize", { size: formatFileSize(result.compressedSize) })}</p>
              <p>
                {result.reduced
                  ? t("tools.compressPdf.reduced", { percent: result.reductionPercent })
                  : t("tools.compressPdf.notReduced")}
              </p>
              <DownloadButton label={t("tools.compressPdf.download")} onClick={download} />
            </CardContent>
          </Card>
        )}
      </div>
    </PdfToolLayout>
  );
}
