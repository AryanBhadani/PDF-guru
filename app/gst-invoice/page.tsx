import { createPageMetadata } from "@/lib/metadata";
import { GstInvoiceClient } from "./gst-invoice-client";

export const metadata = createPageMetadata(
  "GST Invoice Generator",
  "Create professional GST invoices with CGST, SGST, and IGST using PDF Guru.",
  "/gst-invoice"
);

export default function GstInvoicePage() {
  return <GstInvoiceClient />;
}
