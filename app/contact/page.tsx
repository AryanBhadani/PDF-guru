import { createPageMetadata } from "@/lib/metadata";
import { ContactClient } from "./contact-client";

export const metadata = createPageMetadata(
  "Contact Us",
  "Get in touch with the PDF Guru team for support, bug reports, or feature requests. We typically respond within 1-2 business days.",
  "/contact"
);

export default function ContactPage() {
  return <ContactClient />;
}
