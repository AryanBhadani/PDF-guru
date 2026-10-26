import { MessageCircle } from "lucide-react";
import { PdfToolLayout } from "./pdf-tool-layout";

interface ComingSoonWhatsAppProps {
  title: string;
  description: string;
}

export function ComingSoonWhatsApp({ title, description }: ComingSoonWhatsAppProps) {
  return (
    <PdfToolLayout title={title} description={description}>
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We are working on bringing bulk WhatsApp messaging to PDF Guru. This feature will allow you to send PDFs to multiple customers using the official WhatsApp Cloud API.
          </p>
        </div>
      </div>
    </PdfToolLayout>
  );
}
