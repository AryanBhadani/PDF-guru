import { en, type Messages } from "./en";
import { hi } from "./hi";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

const catalogs: Record<Locale, Messages> = { en, hi };

type NestedKey<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKey<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type MessageKey = NestedKey<Messages>;

export type InterpVars = Record<string, string | number>;

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}

export function resolveMessage(messages: Messages, key: string): string {
  const parts = key.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

export function interpolate(template: string, vars?: InterpVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined ? `{${name}}` : String(vars[name])
  );
}

export function translate(locale: Locale, key: string, vars?: InterpVars): string {
  return interpolate(resolveMessage(getMessages(locale), key), vars);
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem("pdf-guru-locale");
    if (stored && isLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}
