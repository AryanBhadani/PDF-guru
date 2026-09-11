"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { ALL_NAV_LINKS, CORE_TOOLS, ADVANCED_TOOLS, SMART_TOOLS, BUSINESS_TOOLS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/components/i18n/language-provider";
import { useState } from "react";

const DESKTOP_HREFS = ["/", "/photo-to-pdf", "/merge-pdf", "/split-pdf"] as const;

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useT();
  const moreActive = [...CORE_TOOLS, ...ADVANCED_TOOLS, ...SMART_TOOLS, ...BUSINESS_TOOLS].some(
    (tool) => tool.href === pathname && !DESKTOP_HREFS.includes(tool.href as (typeof DESKTOP_HREFS)[number])
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {DESKTOP_HREFS.map((href) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              {href === "/" ? t("nav.home") : t(`tools.${toolI18n(href)}.nav`)}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "gap-1 text-sm",
                  moreActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {t("nav.tools")}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("nav.core")}</DropdownMenuLabel>
              {CORE_TOOLS.map((tool) => (
                <DropdownMenuItem key={tool.href} asChild>
                  <Link href={tool.href}>{t(`tools.${tool.i18n}.nav`)}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuLabel>{t("nav.advanced")}</DropdownMenuLabel>
              {ADVANCED_TOOLS.map((tool) => (
                <DropdownMenuItem key={tool.href} asChild>
                  <Link href={tool.href}>{t(`tools.${tool.i18n}.nav`)}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuLabel>{t("nav.smart")}</DropdownMenuLabel>
              {SMART_TOOLS.map((tool) => (
                <DropdownMenuItem key={tool.href} asChild>
                  <Link href={tool.href}>{t(`tools.${tool.i18n}.nav`)}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuLabel>{t("nav.business")}</DropdownMenuLabel>
              {BUSINESS_TOOLS.map((tool) => (
                <DropdownMenuItem key={tool.href} asChild>
                  <Link href={tool.href}>{t(`tools.${tool.i18n}.nav`)}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="flex items-center gap-1">
          <LanguageSwitcher className="hidden h-9 w-[7.5rem] lg:block" />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("nav.menu")}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t("app.name")}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <LanguageSwitcher />
              </div>
              <nav className="mt-6 flex flex-col gap-1 pb-8">
                <p className="px-3 pb-1 text-xs font-semibold uppercase text-muted-foreground">{t("nav.menu")}</p>
                {ALL_NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-3 text-sm",
                      pathname === link.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                  >
                    {t(link.i18n)}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function toolI18n(href: string): string {
  const tool = [...CORE_TOOLS, ...ADVANCED_TOOLS, ...SMART_TOOLS, ...BUSINESS_TOOLS].find((item) => item.href === href);
  return tool?.i18n ?? "photoToPdf";
}
