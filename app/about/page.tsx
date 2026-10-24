import { APP_NAME, APP_DESCRIPTION, CORE_TOOLS, ADVANCED_TOOLS, SMART_TOOLS, BUSINESS_TOOLS } from "@/lib/constants";
import { createPageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = createPageMetadata(
  "About",
  `Learn more about ${APP_NAME} and its features.`,
  "/about"
);

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">About {APP_NAME}</h1>
          <p className="mt-2 text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>

        <div className="space-y-6 prose prose-slate dark:prose-invert max-w-none">
          <section>
            <h2 className="text-2xl font-semibold">Our Mission</h2>
            <p>
              {APP_NAME} is a free online PDF toolkit designed to help students, professionals, and businesses process PDF documents quickly and securely. Our tools run entirely in your browser, ensuring your files stay on your device.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">What We Offer</h2>
            <p>
              {APP_NAME} provides a comprehensive suite of PDF tools organized into four categories:
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold">Core Tools</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {CORE_TOOLS.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold">Advanced Tools</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {ADVANCED_TOOLS.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold">Smart Tools</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {SMART_TOOLS.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold">Business Tools</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {BUSINESS_TOOLS.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Privacy & Security</h2>
            <p>
              Most {APP_NAME} tools process your files entirely in your browser using client-side JavaScript. Your documents are never uploaded to our servers, ensuring maximum privacy and security. For tools that require external services (such as Bulk WhatsApp), we clearly disclose the third-party services involved.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Free to Use</h2>
            <p>
              {APP_NAME} is completely free to use. There are no subscriptions, hidden fees, or premium tiers. We believe in making powerful PDF tools accessible to everyone.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p>
              Have questions, feedback, or suggestions? We&apos;d love to hear from you.
            </p>
            <p>
              <Link href="/contact" className="text-primary hover:underline">
                Visit our Contact page →
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
