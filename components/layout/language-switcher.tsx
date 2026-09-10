"use client";

import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n/language-provider";
import { NativeSelect } from "@/components/ui/select";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <NativeSelect
      aria-label={t("nav.language")}
      className={className ?? "h-9 w-[7.5rem]"}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
    >
      {LOCALES.map((code) => (
        <option key={code} value={code}>
          {LOCALE_LABELS[code]}
        </option>
      ))}
    </NativeSelect>
  );
}
