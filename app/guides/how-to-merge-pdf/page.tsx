import Link from "next/link";
import { createPageMetadata, SITE_URL } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "How to Merge PDF Files – Step-by-Step Guide",
  "Learn how to combine multiple PDF files into one document using PDF Guru's free online merge tool. No uploads, no sign-up — works entirely in your browser.",
  "/guides/how-to-merge-pdf"
);

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
    {
      "@type": "ListItem",
      position: 3,
      name: "How to Merge PDF Files",
      item: `${SITE_URL}/guides/how-to-merge-pdf`,
    },
  ],
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Merge PDF Files",
  description: "Combine multiple PDF files into one document using PDF Guru's free browser-based merge tool.",
  url: `${SITE_URL}/guides/how-to-merge-pdf`,
  step: [
    { "@type": "HowToStep", position: 1, name: "Open the Merge PDF tool", text: "Navigate to the Merge PDF page on PDF Guru.", url: `${SITE_URL}/merge-pdf` },
    { "@type": "HowToStep", position: 2, name: "Upload your PDF files", text: "Click the upload area or drag and drop your PDF files. You can add up to 30 PDFs at once." },
    { "@type": "HowToStep", position: 3, name: "Reorder the files", text: "Drag files up or down in the list to set the order they will appear in the merged document." },
    { "@type": "HowToStep", position: 4, name: "Merge and download", text: "Click the Merge button. Once processing is complete, your combined PDF will download automatically." },
  ],
};

const STEPS = [
  {
    n: 1,
    title: "Open the Merge PDF tool",
    text: "Go to PDF Guru › Merge PDF. No account or installation is required.",
    link: { href: "/merge-pdf", label: "Open Merge PDF →" },
  },
  {
    n: 2,
    title: "Upload your PDF files",
    text: "Click the upload area or drag and drop your PDF files directly onto it. You can add up to 30 PDFs at a time, each up to 50 MB. Files are listed in the order you added them.",
  },
  {
    n: 3,
    title: "Reorder the files (optional)",
    text: "If the order matters, drag and drop the files in the list to rearrange them. The merged PDF will follow this order from top to bottom.",
  },
  {
    n: 4,
    title: "Remove unwanted files (optional)",
    text: "Click the × button next to any file you want to exclude. You can also add more files at any time before merging.",
  },
  {
    n: 5,
    title: "Click Merge and download",
    text: 'Press the Merge button. PDF Guru combines the files in your browser using the pdf-lib library. When processing is complete, the merged PDF downloads automatically with the filename "pdf-guru-merged.pdf".',
  },
];

const TIPS = [
  { label: "File limit", text: "The tool supports up to 30 PDFs per merge. For larger batches, split them into groups, merge each group, then merge the results." },
  { label: "File size", text: "Each individual file can be up to 50 MB. Larger files may cause slower processing because merging happens on-device." },
  { label: "Password-protected PDFs", text: "If a PDF is password-protected, you'll receive an error. Remove the password first before merging." },
  { label: "Page order", text: "Drag files in the list — the top file becomes the first pages of the merged document." },
  { label: "Large PDFs", text: "For very large files, make sure your browser tab has enough memory. Close other tabs if processing is slow." },
];

const TROUBLESHOOTING = [
  { problem: "The merge button is greyed out", solution: "You need to add at least one PDF before merging. Upload a file first, then the button will activate." },
  { problem: 'I see an error: "file could not be read"', solution: "The file may be corrupted or in an unsupported format. Try opening it in a PDF viewer first to confirm it is valid. If it opens correctly, try re-uploading it." },
  { problem: "The merged PDF is missing pages", solution: "Check that all uploaded files are complete and not truncated. Try merging a smaller batch to isolate the problematic file." },
  { problem: "The download does not start", solution: "Your browser may be blocking automatic downloads. Check for a download permission pop-up in the address bar and allow it, or try a different browser." },
];

const FAQS = [
  { q: "Is merging PDFs on PDF Guru really free?", a: "Yes. The Merge PDF tool is completely free with no file-count limits, no sign-up, and no watermarks on the output." },
  { q: "Are my PDF files uploaded to a server?", a: "No. All merging happens locally in your browser using WebAssembly and JavaScript. Your files never leave your device." },
  { q: "Will merged PDFs preserve hyperlinks, bookmarks, and form fields?", a: "PDF Guru uses pdf-lib to merge files. Basic content, text, and images are preserved. Complex interactive features like form fields, JavaScript actions, and digital signatures may not carry over perfectly in all cases." },
  { q: "Can I merge a scanned PDF with a text PDF?", a: "Yes. PDF Guru handles both scanned (image-based) and text-based PDFs. The output will be a combined PDF containing both types of pages." },
  { q: "How do I merge PDFs on a phone?", a: "PDF Guru works in mobile browsers. Open the Merge PDF page, tap the upload area, choose your files from your device storage, reorder if needed, and tap Merge." },
];

export default function HowToMergePdfPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li className="flex items-center gap-1"><span aria-hidden="true" className="select-none">›</span>
            <Link href="/guides" className="hover:text-foreground transition-colors">Guides</Link></li>
          <li className="flex items-center gap-1"><span aria-hidden="true" className="select-none">›</span>
            <span className="text-foreground font-medium" aria-current="page">How to Merge PDF</span></li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-3">How to Merge PDF Files</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Combining multiple PDF documents into a single file is one of the most common PDF tasks.
          PDF Guru&apos;s Merge PDF tool does this entirely in your browser — your files are never uploaded to any server.
        </p>
        <div className="mt-4">
          <Link href="/merge-pdf" className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors">
            Open Merge PDF Tool →
          </Link>
        </div>
      </header>

      <div className="space-y-10">
        {/* Steps */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Step-by-Step Instructions</h2>
          <ol className="space-y-6 list-none pl-0">
            {STEPS.map(({ n, title, text, link }) => (
              <li key={n} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-sm font-bold">{n}</div>
                <div>
                  <h3 className="font-semibold text-base mb-1">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
                  {link && (
                    <Link href={link.href} className="inline-block mt-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline">
                      {link.label}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Tips */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Tips for Best Results</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {TIPS.map(({ label, text }) => (
              <li key={label}><strong className="text-foreground">{label}:</strong> {text}</li>
            ))}
          </ul>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Troubleshooting</h2>
          <div className="space-y-4">
            {TROUBLESHOOTING.map(({ problem, solution }) => (
              <div key={problem} className="rounded-lg border border-border p-4">
                <p className="font-medium text-sm mb-1">Problem: {problem}</p>
                <p className="text-sm text-muted-foreground">Solution: {solution}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-base mb-1">{q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
            <div>
              <h3 className="font-semibold text-base mb-1">How do I reassemble split pages into a new PDF?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use{" "}
                <Link href="/merge-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">PDF Guru&apos;s Merge PDF tool</Link>
                {" "}to upload the extracted PDFs and combine them in any order.
              </p>
            </div>
          </div>
        </section>

        {/* Related */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Related Guides</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/guides/how-to-split-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">How to Split a PDF →</Link></li>
            <li><Link href="/guides/how-to-compress-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">How to Compress a PDF →</Link></li>
            <li><Link href="/guides" className="text-cyan-600 dark:text-cyan-400 hover:underline">All PDF Guides →</Link></li>
          </ul>
        </section>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Ready to merge your PDFs?</p>
            <p className="text-sm text-muted-foreground mt-0.5">Free, instant, and 100% private.</p>
          </div>
          <Link href="/merge-pdf" className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors">
            Open Merge PDF →
          </Link>
        </div>
      </div>
    </article>
  );
}
