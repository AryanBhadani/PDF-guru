import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";
import { APP_NAME } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = createPageMetadata(
  "FAQ - Frequently Asked Questions",
  `Find answers to common questions about ${APP_NAME}s free PDF tools, privacy, security, and how to use our services.`,
  "/faq"
);

const faqs = [
  {
    question: "What is PDF Guru?",
    answer: `${APP_NAME} is a free online platform that provides a comprehensive suite of PDF tools. You can merge, split, compress, convert, and edit PDFs directly in your browser. Our tools include Photo to PDF, Merge PDF, Split PDF, PDF Reader, GST Invoice, PDF to PPT, Mask Document, Compress PDF, PDF to Image, Image to PDF, Clean PDF, PDF Editor, Screenshot Editor, and PDF to Excel. All tools are designed to work securely without requiring software installation.`
  },
  {
    question: "Are PDF Guru tools free to use?",
    answer: `Yes, all of ${APP_NAME}s PDF tools are completely free to use. There are no subscriptions, hidden fees, or payment requirements. You can use our tools as many times as you need without creating an account.`
  },
  {
    question: "How do I merge PDF files?",
    answer: `To merge PDF files, visit our <Link href="/merge-pdf" className="text-primary hover:underline">Merge PDF</Link> tool. Upload multiple PDF files in any order, arrange them as needed, and click the merge button. The combined PDF will be generated directly in your browser and ready for download. All processing happens locally on your device for maximum security.`
  },
  {
    question: "How do I compress a PDF?",
    answer: `To compress a PDF, go to our <Link href="/compress-pdf" className="text-primary hover:underline">Compress PDF</Link> tool. Upload your PDF file and choose from low, medium, or high compression levels. You can see the actual file size reduction before downloading. The compression is performed entirely in your browser, ensuring your files remain private.`
  },
  {
    question: "How do I split a PDF?",
    answer: `To split a PDF, use our <Link href="/split-pdf" className="text-primary hover:underline">Split PDF</Link> tool. Upload your PDF and specify the page ranges you want to extract, or choose to save every page as a separate PDF. You can download individual pages or all extracted pages as a ZIP file. Like all our tools, splitting is done locally in your browser.`
  },
  {
    question: "Are my PDF files safe?",
    answer: `Your privacy and security are important to us. Most ${APP_NAME} tools process your files entirely in your browser using client-side JavaScript. Your files are not uploaded to our servers for processing. This includes Merge, Split, Compress PDF, PDF to Image, Image to PDF, PDF Editor, Clean PDF, Photo to PDF, Screenshot Editor, and most other PDF conversion and editing tools. For detailed information about how we handle your data, please review our <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.`
  }
];

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Frequently Asked Questions</h1>
          <p className="mt-2 text-muted-foreground">
            Find answers to common questions about {APP_NAME}s PDF tools and services.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/50 px-4 py-6 text-center">
          <p className="text-muted-foreground">
            Have more questions? <Link href="/contact" className="text-primary font-medium hover:underline">Contact us</Link> for support.
          </p>
        </div>
      </div>
    </div>
  );
}
