"use client";

import Link from "next/link";
import { APP_NAME, CORE_TOOLS, ADVANCED_TOOLS, SMART_TOOLS, BUSINESS_TOOLS } from "@/lib/constants";
import { Logo } from "@/components/layout/logo";
import { useT } from "@/components/i18n/language-provider";

export function Footer() {
  const t = useT();
  const more = [...SMART_TOOLS, ...BUSINESS_TOOLS];

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{t("footer.blurb")}</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.core")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {CORE_TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="hover:text-foreground">
                  {t(`tools.${tool.i18n}.nav`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.advanced")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {ADVANCED_TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="hover:text-foreground">
                  {t(`tools.${tool.i18n}.nav`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.more")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {more.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="hover:text-foreground">
                  {t(`tools.${tool.i18n}.nav`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        {APP_NAME} · {t("footer.privacy")}
      </div>
    </footer>
  );
}
