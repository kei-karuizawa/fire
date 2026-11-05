import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { en, type MessageKey, type Messages } from "./en"
import { ja } from "./ja"
import { zhHans } from "./zh-Hans"
import { zhHant } from "./zh-Hant"

export const languages = [
  { code: "en", name: "English" },
  { code: "zh-Hans", name: "简体中文" },
  { code: "zh-Hant", name: "繁體中文" },
  { code: "ja", name: "日本語" },
] as const

export type Language = (typeof languages)[number]["code"]
export type Vars = Record<string, string | number>
export type Translate = (key: MessageKey, vars?: Vars) => string

const catalogs: Record<Language, Messages> = { en, "zh-Hans": zhHans, "zh-Hant": zhHant, ja }
const storageKey = "fire.uiLanguage"

// Matches a BCP 47 tag from the browser to one of Fire's languages.
export function matchLanguage(tag: string): Language | undefined {
  const lower = tag.toLowerCase()
  if (lower.startsWith("zh")) {
    return /hant|-tw|-hk|-mo/.test(lower) ? "zh-Hant" : "zh-Hans"
  }
  if (lower.startsWith("ja")) return "ja"
  if (lower.startsWith("en")) return "en"
  return undefined
}

function initialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(storageKey)
    const found = languages.find((item) => item.code === saved)
    if (found) return found.code
  } catch {
    // Storage can be unavailable; fall back to the browser's languages.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const match = matchLanguage(tag)
    if (match) return match
  }
  return "en"
}

export function format(text: string, vars?: Vars) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    vars[name] === undefined ? whole : String(vars[name]),
  )
}

export function translate(lang: Language, key: MessageKey, vars?: Vars): string {
  const entry = catalogs[lang][key] ?? en[key]
  if (typeof entry === "string") return format(entry, vars)
  const count = Number(vars?.count ?? 0)
  const rule = new Intl.PluralRules(lang).select(count) as keyof typeof entry
  return format(entry[rule] ?? entry.other, vars)
}

// Region codes Apple uses for territories (ISO 3166 alpha-3) mapped to alpha-2.
const alpha3: Record<string, string> = {
  USA: "US", CHN: "CN", JPN: "JP", TWN: "TW", HKG: "HK", GBR: "GB", DEU: "DE", FRA: "FR", CAN: "CA", AUS: "AU",
  KOR: "KR", SGP: "SG", ITA: "IT", ESP: "ES", NLD: "NL", BRA: "BR", MEX: "MX", IND: "IN", RUS: "RU", CHE: "CH",
}

export type I18n = ReturnType<typeof build>

function build(lang: Language, setLang: (lang: Language) => void) {
  const t: Translate = (key, vars) => translate(lang, key, vars)
  const has = (key: string) => key in catalogs[lang] || key in en
  // Translates an App Store Connect value such as a state, falling back to a readable form.
  const enumLabel = (group: string, value: string | undefined | null) => {
    if (!value) return "—"
    const key = `${group}.${value}`
    if (has(key)) return t(key as MessageKey)
    return value
      .toLowerCase()
      .split("_")
      .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
      .join(" ")
  }
  const languageNames = new Intl.DisplayNames([lang], { type: "language" })
  const regionNames = new Intl.DisplayNames([lang], { type: "region" })
  const number = new Intl.NumberFormat(lang)
  const compact = new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 })
  const date = (value: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions) => {
    if (!value) return "—"
    const parsed = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value
    if (Number.isNaN(parsed.getTime())) return "—"
    return parsed.toLocaleDateString(lang, options ?? { year: "numeric", month: "short", day: "numeric" })
  }
  return {
    lang,
    setLang,
    t,
    enumLabel,
    number: (value: number) => number.format(value),
    compact: (value: number) => (Math.abs(value) < 10000 ? number.format(Math.round(value)) : compact.format(value)),
    money: (value: number, currency: string, compactForm = false) => {
      try {
        return new Intl.NumberFormat(lang, {
          style: "currency",
          currency,
          notation: compactForm && Math.abs(value) >= 10000 ? "compact" : "standard",
          maximumFractionDigits: compactForm && Math.abs(value) >= 10000 ? 1 : undefined,
        }).format(value)
      } catch {
        return `${number.format(value)} ${currency}`
      }
    },
    date,
    shortDate: (value: string | Date) => date(value, { month: "short", day: "numeric" }),
    dateTime: (value: string | undefined | null) =>
      value ? new Date(value).toLocaleString(lang, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—",
    localeName: (code: string) => {
      try {
        return languageNames.of(code) ?? code
      } catch {
        return code
      }
    },
    regionName: (code: string) => {
      try {
        return regionNames.of(alpha3[code] ?? code) ?? code
      } catch {
        return code
      }
    },
  }
}

const Context = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(initialLanguage)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      window.localStorage.setItem(storageKey, lang)
    } catch {
      // The choice still applies for this visit.
    }
  }, [lang])
  const value = useMemo(() => build(lang, setLang), [lang])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useI18n() {
  const value = useContext(Context)
  if (!value) throw new Error("useI18n must be used inside I18nProvider")
  return value
}

export type { MessageKey }
