import Link from "next/link";
import { APP_NAME, CORE_TOOLS, ADVANCED_TOOLS } from "@/lib/constants";
import { Logo } from "@/components/layout/logo";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Convert, merge, split, invoice, summarize, compress, and mask PDFs in the browser. Your files stay on your device.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Core tools</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {CORE_TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="hover:text-foreground">
                  {tool.navLabel}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Advanced tools</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {ADVANCED_TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="hover:text-foreground">
                  {tool.navLabel}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        {APP_NAME} · Files are processed locally and are not stored
      </div>
    </footer>
  );
}
