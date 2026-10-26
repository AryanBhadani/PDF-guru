import { createPageMetadata } from "@/lib/metadata";
import { ComingSoonWhatsApp } from "@/components/pdf/coming-soon-whatsapp";

export const metadata = createPageMetadata(
  "Bulk WhatsApp PDF - Send PDFs via WhatsApp Cloud API",
  "Send PDFs to customers using the official WhatsApp Cloud API. Map PDFs to customers and automate bulk messaging. Requires API configuration.",
  "/bulk-whatsapp"
);

export default function BulkWhatsappPage() {
  return (
    <ComingSoonWhatsApp
      title="Bulk WhatsApp PDF"
      description="Send PDFs to customers using the official WhatsApp Cloud API. Map PDFs to customers and automate bulk messaging. Requires API configuration."
    />
  );
}
