import Link from "next/link";
import { createPageMetadata, SITE_URL } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "How to Compress a PDF – Reduce File Size Guide",
  "Learn how to reduce PDF file size using PDF Guru's free compress tool. Choose low, medium, or high compression, or set a custom target size. Browser-based, no uploads.",
  "/guides/how-to-compress-pdf"
);

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
    { "@type": "ListItem", position: 3, name: "How to Compress a PDF", item: `${SITE_URL}/guides/how-to-compress-pdf` },
  ],
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Compress a PDF",
  description: "Reduce PDF file size using PDF Guru's free browser-based compress tool with low, medium, or high compression levels.",
  url: `${SITE_URL}/guides/how-to-compress-pdf`,
  step: [
    { "@type": "HowToStep", position: 1, name: "Open the Compress PDF tool", text: "Navigate to the Compress PDF page on PDF Guru.", url: `${SITE_URL}/compress-pdf` },
    { "@type": "HowToStep", position: 2, name: "Upload your PDF", text: "Click the upload area or drag and drop your PDF file. Only one file can be compressed at a time." },
    { "@type": "HowToStep", position: 3, name: "Choose compression level", text: "Select Low, Medium, or High compression. You can also enter a target file size in KB or MB." },
    { "@type": "HowToStep", position: 4, name: "Compress and download", text: "Click the Compress button. The tool shows original and compressed sizes. Download your smaller PDF." },
  ],
};

const LEVELS = [
  { level: "Low", reduction: "~20–40% smaller", use: "When you need to preserve visual quality for printing or professional sharing.", color: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30" },
  { level: "Medium", reduction: "~50–65% smaller", use: "The best balance for most use cases: email attachments, web uploads, internal sharing.", color: "border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/30" },
  { level: "High", reduction: "~70–85% smaller", use: "Maximum compression. Best for archiving or when file size matters more than image sharpness.", color: "border-orange-500/40 bg-orange-50 dark:bg-orange-950/30" },
];

const STEPS = [
  { n: 1, title: "Open the Compress PDF tool", text: "Navigate to PDF Guru › Compress PDF. No account or installation is needed.", link: { href: "/compress-pdf", label: "Open Compress PDF →" } },
  { n: 2, title: "Upload your PDF", text: "Click the upload area or drag and drop your PDF. Only one file can be compressed at a time. The tool displays the original file size and page count." },
  { n: 3, title: "Select a compression level", text: "Choose Low, Medium, or High from the dropdown. Medium is the recommended starting point for most documents." },
  { n: 4, title: "Set a target size (optional)", text: "If you need the file below a specific size (e.g., for an email attachment limit), enter a target in the KB or MB field. The tool will try to achieve this target but cannot guarantee it for all PDFs." },
  { n: 5, title: "Click Compress", text: "The tool processes each page of your PDF. A progress bar shows the current page. For multi-page PDFs this may take a few seconds." },
  { n: 6, title: "Review the result and download", text: "After compression, the tool displays the original size, compressed size, and percentage reduction. If you're satisfied, click Download to save the compressed PDF." },
];

const TIPS = [
  { label: "Scanned documents compress best", text: "A PDF made of scanned pages will compress much more than a text-only PDF, because text-based PDFs are already efficient." },
  { label: "Already-compressed PDFs have limited room", text: "If your PDF was previously compressed, further compression may barely reduce size or even slightly increase it." },
  { label: "Use medium first", text: "Start with Medium compression, check the output quality, and only use High if you need further reduction and can accept lower image sharpness." },
  { label: "Target size is best-effort", text: "The tool uses binary search across quality levels to approach your target, but it cannot guarantee the exact size for all PDFs." },
  { label: "Large PDFs take longer", text: "Because each page is re-rendered in your browser, a 100-page PDF will take noticeably longer than a 5-page document." },
];

const TROUBLESHOOTING = [
  { problem: "The compressed file is larger than the original", solution: "This happens when the original PDF is already highly compressed. Text-only PDFs are typically already small and efficient. Try a different level or accept the PDF is near its minimum size." },
  { problem: "A warning says the target size was not achieved", solution: "The target was too aggressive for the PDF's content. Try a higher compression level, or accept the closest size the tool was able to reach." },
  { problem: "The tool is slow on a large PDF", solution: "Compression is CPU-intensive and runs in your browser. Close other browser tabs and applications to free up memory. For very large PDFs (50+ pages), this may take a minute or more." },
  { problem: "The output PDF looks blurry", solution: "Switch from High to Medium or Low compression. High compression significantly reduces image DPI, which causes visible blur on scanned documents." },
];

const FAQS = [
  { q: "Does compressing a PDF reduce its quality permanently?", a: "The compression process reduces the resolution of images within the PDF. This is irreversible in the compressed file, but your original file is unchanged. Always keep a backup of the original." },
  { q: "Can I compress a PDF to under 1 MB?", a: "It depends on the PDF content. A scanned document can usually be compressed significantly. A simple text PDF may already be under 1 MB. Enter a target size in the optional field and the tool will attempt to meet it." },
  { q: "Why is text-heavy PDF compression less effective?", a: "Text-based PDFs store characters as vector data, which is already very compact. Compressing them re-renders pages as images, which can actually make the file larger. The tool works best on image-heavy or scanned PDFs." },
  { q: "Is my PDF sent to a server during compression?", a: "No. All processing happens locally in your browser using WebAssembly (pdf-lib and canvas). Your files are never transmitted to any server." },
  { q: "Can I compress multiple PDFs at once?", a: "Currently, PDF Guru's Compress tool processes one PDF at a time. To compress multiple files, process them one by one." },
];

export default function HowToCompressPdfPage() {
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
            <span className="text-foreground font-medium" aria-current="page">How to Compress PDF</span></li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-3">How to Compress a PDF</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Large PDF files are slow to share and can exceed email size limits. PDF Guru&apos;s
          Compress PDF tool reduces file size directly in your browser — with options for
          low, medium, or high compression, plus the ability to target a specific file size.
        </p>
        <div className="mt-4">
          <Link href="/compress-pdf" className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors">
            Open Compress PDF Tool →
          </Link>
        </div>
      </header>

      <div className="space-y-10">
        {/* Compression levels */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Understanding Compression Levels</h2>
          <p className="text-muted-foreground text-sm mb-4">
            PDF Guru offers three preset compression levels. The tool works by re-rendering each page
            as a compressed image — most effective for PDFs that consist primarily of scanned pages or images.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {LEVELS.map(({ level, reduction, use, color }) => (
              <div key={level} className={`rounded-lg border p-4 ${color}`}>
                <p className="font-bold text-sm mb-1">{level} Compression</p>
                <p className="text-xs text-muted-foreground mb-2">{reduction}</p>
                <p className="text-xs text-muted-foreground">{use}</p>
              </div>
            ))}
          </div>
        </section>

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
                    <Link href={link.href} className="inline-block mt-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline">{link.label}</Link>
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
          </div>
        </section>

        {/* Related */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Related Guides</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/guides/how-to-merge-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">How to Merge PDF Files →</Link></li>
            <li><Link href="/guides/how-to-split-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">How to Split a PDF →</Link></li>
            <li><Link href="/guides" className="text-cyan-600 dark:text-cyan-400 hover:underline">All PDF Guides →</Link></li>
          </ul>
        </section>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Ready to reduce your PDF size?</p>
            <p className="text-sm text-muted-foreground mt-0.5">Free, private, and instant.</p>
          </div>
          <Link href="/compress-pdf" className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors">
            Open Compress PDF →
          </Link>
        </div>
      </div>
    </article>
  );
}
