import Link from "next/link";
import {
  ArrowRight,
  Combine,
  Download,
  FileImage,
  ImageDown,
  Images,
  Lock,
  Minimize2,
  Presentation,
  Receipt,
  Scissors,
  ShieldOff,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ADVANCED_TOOLS, APP_DESCRIPTION, APP_NAME, APP_TAGLINE, CORE_TOOLS } from "@/lib/constants";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  `${APP_NAME} – Free Online PDF Tools`,
  APP_DESCRIPTION,
  "/"
);

const ICONS = {
  Images,
  Combine,
  Scissors,
  Receipt,
  Sparkles,
  Presentation,
  ShieldOff,
  Minimize2,
  ImageDown,
  FileImage,
} as const;

function ToolGrid({
  tools,
}: {
  tools: readonly { href: string; title: string; description: string; icon: keyof typeof ICONS }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => {
        const Icon = ICONS[tool.icon];
        return (
          <Link key={tool.href} href={tool.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      <section className="border-b bg-gradient-to-b from-accent/50 to-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
          <p className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary">
            {APP_NAME}
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            {APP_NAME}
          </h1>
          <p className="text-xl text-muted-foreground sm:text-2xl">{APP_TAGLINE}</p>
          <p className="max-w-2xl text-muted-foreground">{APP_DESCRIPTION}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/photo-to-pdf">
                Start Using PDF Guru
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#tools">Explore Tools</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-3 text-2xl font-semibold">Core tools</h2>
        <p className="mb-8 text-sm text-muted-foreground">Everyday convert, merge, split, invoice, and summary tools.</p>
        <ToolGrid tools={CORE_TOOLS} />
        <h2 className="mb-3 mt-14 text-2xl font-semibold">Advanced tools</h2>
        <p className="mb-8 text-sm text-muted-foreground">
          Convert to PPT, mask IDs, compress files, and export images.
        </p>
        <ToolGrid tools={ADVANCED_TOOLS} />
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3">
          {[
            { icon: Upload, title: "1. Upload", text: "Drop images or PDFs. Nothing is stored on a server." },
            { icon: Sparkles, title: "2. Process", text: "Merge, split, convert, invoice, compress, or mask in the browser." },
            { icon: Download, title: "3. Download", text: "Get a clean PDF, PPTX, image, or ZIP instantly on your device." },
          ].map((step) => (
            <div key={step.title} className="rounded-xl border bg-card p-6">
              <step.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <Lock className="mt-1 h-5 w-5 text-primary" />
            <div>
              <CardTitle>Private by design</CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                PDF Guru prefers client-side processing. Uploaded files are used only to complete your
                task and are not saved permanently. Always verify masked documents before sharing.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/photo-to-pdf">Start Using PDF Guru</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
