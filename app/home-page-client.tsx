"use client";

import Link from "next/link";
import {
  ArrowRight,
  Combine,
  Download,
  FileImage,
  FileType,
  ImageDown,
  Images,
  Lock,
  MessageCircle,
  Minimize2,
  Presentation,
  Receipt,
  Scissors,
  ScanText,
  ShieldOff,
  Sparkles,
  Table,
  Upload,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ADVANCED_TOOLS, BUSINESS_TOOLS, CORE_TOOLS, SMART_TOOLS } from "@/lib/constants";
import { useT } from "@/components/i18n/language-provider";

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
  WandSparkles,
  FileType,
  Table,
  ScanText,
  MessageCircle,
} as const;

function ToolGrid({
  tools,
  t,
}: {
  tools: readonly { href: string; icon: keyof typeof ICONS; i18n: string }[];
  t: (key: string) => string;
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
                <CardTitle>{t(`tools.${tool.i18n}.title`)}</CardTitle>
                <CardDescription>{t(`tools.${tool.i18n}.desc`)}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function HomePageClient() {
  const t = useT();

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-accent/50 to-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
          <p className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary">{t("app.name")}</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{t("app.name")}</h1>
          <p className="text-xl text-muted-foreground sm:text-2xl">{t("app.tagline")}</p>
          <p className="max-w-2xl text-muted-foreground">{t("app.description")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/photo-to-pdf">
                {t("common.start")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#tools">{t("common.explore")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-3 text-2xl font-semibold">{t("home.coreTitle")}</h2>
        <p className="mb-8 text-sm text-muted-foreground">{t("home.coreHint")}</p>
        <ToolGrid tools={CORE_TOOLS} t={t} />
        <h2 className="mb-3 mt-14 text-2xl font-semibold">{t("home.advancedTitle")}</h2>
        <p className="mb-8 text-sm text-muted-foreground">{t("home.advancedHint")}</p>
        <ToolGrid tools={ADVANCED_TOOLS} t={t} />
        <h2 className="mb-3 mt-14 text-2xl font-semibold">{t("home.smartTitle")}</h2>
        <p className="mb-8 text-sm text-muted-foreground">{t("home.smartHint")}</p>
        <ToolGrid tools={SMART_TOOLS} t={t} />
        <h2 className="mb-3 mt-14 text-2xl font-semibold">{t("home.businessTitle")}</h2>
        <p className="mb-8 text-sm text-muted-foreground">{t("home.businessHint")}</p>
        <ToolGrid tools={BUSINESS_TOOLS} t={t} />
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3">
          {[
            { icon: Upload, title: t("home.step1Title"), text: t("home.step1Text") },
            { icon: Sparkles, title: t("home.step2Title"), text: t("home.step2Text") },
            { icon: Download, title: t("home.step3Title"), text: t("home.step3Text") },
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
              <CardTitle>{t("home.privacyTitle")}</CardTitle>
              <CardDescription className="mt-2 max-w-2xl">{t("home.privacyBody")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/photo-to-pdf">{t("common.start")}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
