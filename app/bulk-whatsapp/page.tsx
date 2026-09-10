import { createPageMetadata } from "@/lib/metadata";
import { BulkWhatsappClient } from "./bulk-whatsapp-client";

export const metadata = createPageMetadata(
  "Bulk WhatsApp PDF",
  "Send PDFs to customers with the official WhatsApp Cloud API using PDF Guru.",
  "/bulk-whatsapp"
);

export default function BulkWhatsappPage() {
  return <BulkWhatsappClient />;
}
