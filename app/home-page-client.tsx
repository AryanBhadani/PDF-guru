"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Combine,
  Download,
  FileEdit,
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
  FileEdit,
  Table,
  ScanText,
  MessageCircle,
} as const;

// Custom badge colors and glowing borders per tool matching the reference aesthetic
const TOOL_STYLES: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    glow: string;
  }
> = {
  // Core Tools
  photoToPdf: {
    bg: "bg-[#062c24]",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.25)]",
  },
  mergePdf: {
    bg: "bg-[#0f1d4a]",
    border: "border-blue-500/40",
    text: "text-blue-400",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.25)]",
  },
  splitPdf: {
    bg: "bg-[#3b0d23]",
    border: "border-rose-500/40",
    text: "text-rose-400",
    glow: "shadow-[0_0_18px_rgba(244,63,94,0.25)]",
  },
  gstInvoice: {
    bg: "bg-[#3a2806]",
    border: "border-amber-500/40",
    text: "text-amber-400",
    glow: "shadow-[0_0_18px_rgba(245,158,11,0.25)]",
  },
  aiSummary: {
    bg: "bg-[#280c4a]",
    border: "border-purple-500/40",
    text: "text-purple-400",
    glow: "shadow-[0_0_18px_rgba(168,85,247,0.25)]",
  },

  // Advanced Tools
  pdfToPpt: {
    bg: "bg-[#3b1a08]",
    border: "border-orange-500/40",
    text: "text-orange-400",
    glow: "shadow-[0_0_18px_rgba(249,115,22,0.25)]",
  },
  maskDocument: {
    bg: "bg-[#380b20]",
    border: "border-pink-500/40",
    text: "text-pink-400",
    glow: "shadow-[0_0_18px_rgba(236,72,153,0.25)]",
  },
  compressPdf: {
    bg: "bg-[#062c20]",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.25)]",
  },
  pdfToImage: {
    bg: "bg-[#082347]",
    border: "border-sky-500/40",
    text: "text-sky-400",
    glow: "shadow-[0_0_18px_rgba(14,165,233,0.25)]",
  },
  imageToPdf: {
    bg: "bg-[#230d42]",
    border: "border-violet-500/40",
    text: "text-violet-400",
    glow: "shadow-[0_0_18px_rgba(139,92,246,0.25)]",
  },

  // Smart Tools
  cleanPdf: {
    bg: "bg-[#06282d]",
    border: "border-teal-500/40",
    text: "text-teal-400",
    glow: "shadow-[0_0_18px_rgba(20,184,166,0.25)]",
  },
  pdfEditor: {
    bg: "bg-[#092244]",
    border: "border-cyan-500/40",
    text: "text-cyan-400",
    glow: "shadow-[0_0_18px_rgba(6,182,212,0.25)]",
  },
  screenshotEditor: {
    bg: "bg-[#2b0d3d]",
    border: "border-fuchsia-500/40",
    text: "text-fuchsia-400",
    glow: "shadow-[0_0_18px_rgba(217,70,239,0.25)]",
  },
  pdfToExcel: {
    bg: "bg-[#062c19]",
    border: "border-green-500/40",
    text: "text-green-400",
    glow: "shadow-[0_0_18px_rgba(34,197,94,0.25)]",
  },

  // Business Tools
  bulkWhatsapp: {
    bg: "bg-[#072c1c]",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.25)]",
  },
};

function ToolGrid({
  tools,
  t,
}: {
  tools: readonly { href: string; icon: keyof typeof ICONS; i18n: string }[];
  t: (key: string) => string;
}) {
  return (
    <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2">
      {tools.map((tool) => {
        const Icon = ICONS[tool.icon];
        const style = TOOL_STYLES[tool.i18n] || {
          bg: "bg-slate-900",
          border: "border-slate-800",
          text: "text-cyan-400",
          glow: "",
        };

        return (
          <Link key={tool.href} href={tool.href} className="group block">
            <div className="flex h-full items-center gap-4 rounded-2xl border border-slate-800/80 bg-[#0c1322]/80 p-4 sm:p-5 backdrop-blur-md transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#101a2e] hover:shadow-[0_0_25px_rgba(6,182,212,0.12)]">
              {/* Tool Icon Badge */}
              <div
                className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border ${style.bg} ${style.border} ${style.text} ${style.glow} transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>

              {/* Tool Info */}
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-[15px] sm:text-base font-bold text-white transition-colors group-hover:text-cyan-300">
                  {t(`tools.${tool.i18n}.title`)}
                </h3>
                <p className="mt-0.5 text-xs sm:text-[13px] text-slate-400 font-normal leading-relaxed line-clamp-2">
                  {t(`tools.${tool.i18n}.desc`)}
                </p>
              </div>

              {/* Right Arrow Button */}
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/60 bg-slate-800/60 text-slate-400 transition-all duration-200 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/15 group-hover:text-cyan-300 group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function HomePageClient() {
  const t = useT();

  return (
    <div className="relative min-h-screen bg-[#060b13] text-slate-100 overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-12 right-0 w-[550px] h-[550px] rounded-full bg-cyan-500/15 blur-[150px] pointer-events-none" />
      <div className="absolute top-[600px] right-1/4 w-[400px] h-[400px] rounded-full bg-teal-500/8 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[160px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-12 pb-8 sm:pt-16 sm:pb-12 lg:pt-20 lg:pb-16">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Headline & CTA */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3.5 py-1 text-xs font-semibold text-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.2)] backdrop-blur-sm">
              <span className="font-bold text-emerald-400">+</span>
              <span>Your PDF Companion</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              PDF Tools <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Made Simple
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-lg text-sm sm:text-base text-slate-300/80 leading-relaxed font-normal">
              Convert, merge, split, create invoices, summarize, compress, mask, and clean PDFs quickly and easily.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-gradient-to-r from-[#10b981] via-[#14b8a6] to-[#06b6d4] px-6 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(20,184,166,0.35)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-[1.02] transition-all border-0 h-12"
              >
                <Link href="/photo-to-pdf" className="gap-2">
                  Start Using PDF Guru
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl border-slate-700/80 bg-slate-900/60 px-6 text-sm font-medium text-slate-200 hover:bg-slate-800/80 hover:text-white hover:border-slate-600 transition-all h-12"
              >
                <Link href="#tools">Explore Tools</Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Hero Graphic */}
          <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
            {/* Glowing Backdrop */}
            <div className="absolute -inset-4 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none -z-10" />

            {/* 3D Composition Illustration */}
            <div className="relative z-10 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)]">
              <Image
                src="/hero-illustration.png"
                alt="PDF Guru Visual Overview"
                width={420}
                height={310}
                priority
                className="w-full h-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Wave Ribbon Divider */}
      <div className="relative w-full overflow-hidden leading-none -mt-4 mb-4 sm:mb-8 pointer-events-none">
        <svg
          className="relative block w-full h-12 sm:h-16 lg:h-20"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C150,90 350,-40 500,60 C650,160 900,10 1200,40 L1200,120 L0,120 Z"
            fill="none"
            stroke="url(#cyanRibbon)"
            strokeWidth="2"
            className="opacity-40"
          />
          <path
            d="M0,20 C180,100 380,-20 540,70 C700,160 920,30 1200,50 L1200,120 L0,120 Z"
            fill="url(#waveFill)"
          />
          <defs>
            <linearGradient id="cyanRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="waveFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Tools Section */}
      <section id="tools" className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* Core Tools */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>Core</span> <span className="text-cyan-400">tools</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{t("home.coreHint")}</p>
        </div>
        <ToolGrid tools={CORE_TOOLS} t={t} />

        {/* Advanced Tools */}
        <div className="mb-6 mt-14 sm:mt-18">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>Advanced</span> <span className="text-cyan-400">tools</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{t("home.advancedHint")}</p>
        </div>
        <ToolGrid tools={ADVANCED_TOOLS} t={t} />

        {/* Smart Tools */}
        <div className="mb-6 mt-14 sm:mt-18">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>Smart</span> <span className="text-cyan-400">tools</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{t("home.smartHint")}</p>
        </div>
        <ToolGrid tools={SMART_TOOLS} t={t} />

        {/* Business Tools */}
        <div className="mb-6 mt-14 sm:mt-18">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>Business</span> <span className="text-cyan-400">tools</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{t("home.businessHint")}</p>
        </div>
        <ToolGrid tools={BUSINESS_TOOLS} t={t} />
      </section>

      {/* 3 Step Workflow */}
      <section className="relative z-10 border-t border-slate-800/60 bg-[#080e1a]/60 backdrop-blur-sm mt-16">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:grid-cols-3">
          {[
            {
              icon: Upload,
              title: t("home.step1Title"),
              text: t("home.step1Text"),
              color: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
            },
            {
              icon: Sparkles,
              title: t("home.step2Title"),
              text: t("home.step2Text"),
              color: "text-cyan-400 bg-cyan-950/50 border-cyan-500/30",
            },
            {
              icon: Download,
              title: t("home.step3Title"),
              text: t("home.step3Text"),
              color: "text-sky-400 bg-sky-950/50 border-sky-500/30",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-slate-800/80 bg-[#0c1322]/80 p-6 backdrop-blur-md"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${step.color}`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy Guarantee */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0c1322]/80 p-6 sm:p-8 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/50 text-emerald-400">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t("home.privacyTitle")}</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                {t("home.privacyBody")}
              </p>
            </div>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold px-6 h-11"
          >
            <Link href="/photo-to-pdf">{t("common.start")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
