"use client";

import { useState } from "react";
import { Table } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { SelectedFile } from "@/components/pdf/selected-file";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PDF_MIME_TYPE } from "@/lib/constants";
import { getPdfPageCount } from "@/lib/pdf";
import { downloadBlob } from "@/lib/utils";
import { useT } from "@/components/i18n/language-provider";
import type { ExtractedSheet } from "@/lib/pdf-to-excel";

export function PdfToExcelClient() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [sheets, setSheets] = useState<ExtractedSheet[]>([]);
  const [likelyTable, setLikelyTable] = useState(true);

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      setFile(next);
      setPageCount(count);
      setSheets([]);
      setLikelyTable(true);
      setProgress({ current: 0, total: 0 });
      toast.success(t("upload.loadedPages", { count }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.readPdf"));
    }
  };

  const extract = async () => {
    if (!file || loading) {
      if (!file) toast.error(t("errors.uploadPdfFirst"));
      return;
    }
    setLoading(true);
    setProgress({ current: 0, total: pageCount });
    try {
      const { extractPdfTables, workbookFromSheets } = await import("@/lib/pdf-to-excel");
      const result = await extractPdfTables(file, (current, total) => setProgress({ current, total }));
      setSheets(result.sheets);
      setLikelyTable(result.likelyTable);
      const blob = workbookFromSheets(result.sheets);
      const name = file.name.replace(/\.pdf$/i, "") || "pdf-guru";
      downloadBlob(blob, `${name}.xlsx`);
      toast.success(t("success.excelReady"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.conversion"));
    } finally {
      setLoading(false);
    }
  };

  const updateCell = (sheetIndex: number, rowIndex: number, cellIndex: number, value: string) => {
    setSheets((current) =>
      current.map((sheet, s) =>
        s === sheetIndex
          ? {
              ...sheet,
              rows: sheet.rows.map((row, r) =>
                r === rowIndex ? row.map((cell, c) => (c === cellIndex ? value : cell)) : row
              ),
            }
          : sheet
      )
    );
  };

  const downloadEdited = async () => {
    if (sheets.length === 0) {
      await extract();
      return;
    }
    const { workbookFromSheets } = await import("@/lib/pdf-to-excel");
    const blob = workbookFromSheets(sheets);
    const name = file?.name.replace(/\.pdf$/i, "") || "pdf-guru";
    downloadBlob(blob, `${name}.xlsx`);
    toast.success(t("success.excelReady"));
  };

  return (
    <PdfToolLayout title={t("tools.pdfToExcel.pageTitle")} description={t("tools.pdfToExcel.pageDesc")}>
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
            icon={<Table className="h-8 w-8" />}
            title={t("tools.pdfToExcel.emptyTitle")}
            hint={t("tools.pdfToExcel.emptyHint")}
          />
        ) : (
          <>
            <SelectedFile name={file.name} size={file.size} extra={`${pageCount} ${t("common.pages")}`} />
            {loading && (
              <ProgressBar current={progress.current} total={progress.total || pageCount} label={t("tools.pdfToExcel.converting")} />
            )}
            <p className="text-sm text-muted-foreground">{t("tools.pdfToExcel.disclaimer")}</p>
            {sheets.length > 0 && !likelyTable && (
              <p className="text-sm text-muted-foreground">{t("tools.pdfToExcel.noTables")}</p>
            )}
            {sheets.slice(0, 1).map((sheet, sheetIndex) => (
              <Card key={sheet.name}>
                <CardHeader>
                  <CardTitle>{sheet.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t("tools.pdfToExcel.editHint")}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <tbody>
                        {sheet.rows.slice(0, 40).map((row, rowIndex) => (
                          <tr key={`${sheet.name}-${rowIndex}`}>
                            {row.map((cell, cellIndex) => (
                              <td key={`${sheet.name}-${rowIndex}-${cellIndex}`} className="border p-1">
                                <Input
                                  value={cell}
                                  onChange={(event) => updateCell(sheetIndex, rowIndex, cellIndex, event.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
        <DownloadButton
          label={t("tools.pdfToExcel.convert")}
          loadingLabel={t("tools.pdfToExcel.converting")}
          loading={loading}
          disabled={!file}
          onClick={sheets.length > 0 ? downloadEdited : extract}
        />
      </div>
    </PdfToolLayout>
  );
}
