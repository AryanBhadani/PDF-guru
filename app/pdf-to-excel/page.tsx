import { createPageMetadata } from "@/lib/metadata";
import { PdfToExcelClient } from "./pdf-to-excel-client";

export const metadata = createPageMetadata(
  "PDF to Excel Online - Extract Tables from PDF",
  "Extract tables from invoices and reports into Excel spreadsheets. Review and edit extracted data before downloading. Best-effort table detection in your browser.",
  "/pdf-to-excel"
);

export default function PdfToExcelPage() {
  return <PdfToExcelClient />;
}
