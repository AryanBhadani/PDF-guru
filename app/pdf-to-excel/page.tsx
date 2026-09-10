import { createPageMetadata } from "@/lib/metadata";
import { PdfToExcelClient } from "./pdf-to-excel-client";

export const metadata = createPageMetadata(
  "PDF to Excel",
  "Pull tables from invoices and reports into a spreadsheet with PDF Guru.",
  "/pdf-to-excel"
);

export default function PdfToExcelPage() {
  return <PdfToExcelClient />;
}
