import { createPageMetadata } from "@/lib/metadata";
import { GstInvoiceClient } from "./gst-invoice-client";

export const metadata = createPageMetadata(
  "GST Invoice Generator - Create Professional GST Invoices",
  "Create professional GST invoices with automatic CGST, SGST, and IGST calculation. Fill seller, buyer, and item details. Download as PDF instantly.",
  "/gst-invoice"
);

export default function GstInvoicePage() {
  return <GstInvoiceClient />;
}
