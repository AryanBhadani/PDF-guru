import { createPageMetadata } from "@/lib/metadata";
import { BulkWhatsappClient } from "./bulk-whatsapp-client";

export const metadata = createPageMetadata(
  "Bulk WhatsApp PDF - Send PDFs via WhatsApp Cloud API",
  "Send PDFs to customers using the official WhatsApp Cloud API. Map PDFs to customers and automate bulk messaging. Requires API configuration.",
  "/bulk-whatsapp"
);

export default function BulkWhatsappPage() {
  return <BulkWhatsappClient />;
}
