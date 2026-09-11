"use client";

import { useState } from "react";
import { FileText, Scissors } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDF_MIME_TYPE } from "@/lib/constants";
import {
  downloadPdf,
  extractAllPages,
  extractRanges,
  getPdfPageCount,
  parseSplitRanges,
  rangeLabel,
  zipPdfs,
} from "@/lib/pdf";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { useT } from "@/components/i18n/language-provider";

export function SplitPdfClient() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState("1-1");
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      setFile(next);
      setPageCount(count);
      setRanges(count > 1 ? `1-${count}` : "1");
      toast.success(t("upload.loadedPages", { count }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.readPdf"));
    }
  };

  const splitByRange = async () => {
    if (!file) {
      toast.error(t("errors.uploadPdfFirst"));
      return;
    }
    setLoading(true);
    try {
      const parsed = parseSplitRanges(ranges, pageCount);
      const outputs = await extractRanges(file, parsed);
      if (outputs.length === 1) {
        downloadPdf(outputs[0], `pdf-guru-${rangeLabel(parsed[0])}.pdf`);
      } else {
        const zip = await zipPdfs(
          outputs.map((bytes, index) => ({
            name: `pdf-guru-${rangeLabel(parsed[index])}.pdf`,
            bytes,
          }))
        );
        downloadBlob(zip, "pdf-guru-split.zip");
      }
      toast.success(t("success.split"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.processing"));
    } finally {
      setLoading(false);
    }
  };

  const splitAll = async () => {
    if (!file) {
      toast.error(t("errors.uploadPdfFirst"));
      return;
    }
    setLoading(true);
    try {
      const outputs = await extractAllPages(file);
      const zip = await zipPdfs(
        outputs.map((bytes, index) => ({
          name: `pdf-guru-page-${index + 1}.pdf`,
          bytes,
        }))
      );
      downloadBlob(zip, "pdf-guru-pages.zip");
      toast.success(t("success.split"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.processing"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout title={t("tools.splitPdf.pageTitle")} description={t("tools.splitPdf.pageDesc")}>
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
            icon={<Scissors className="h-8 w-8" />}
            title={t("tools.splitPdf.emptyTitle")}
            hint={t("tools.splitPdf.emptyHint")}
          />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)} · {pageCount} {t("common.pages")}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ranges">{t("tools.splitPdf.ranges")}</Label>
              <Input
                id="ranges"
                value={ranges}
                disabled={loading}
                onChange={(event) => setRanges(event.target.value)}
                placeholder="1-3, 5, 7-9"
              />
              <p className="text-xs text-muted-foreground">
                {t("tools.splitPdf.rangesHint")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <DownloadButton
                label={t("tools.splitPdf.extract")}
                loadingLabel={t("tools.splitPdf.extracting")}
                loading={loading}
                onClick={splitByRange}
              />
              <Button size="lg" variant="outline" disabled={loading} onClick={splitAll}>
                {t("tools.splitPdf.extractAll")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PdfToolLayout>
  );
}
