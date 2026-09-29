"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  CATALOG_LOCALE_STORAGE_KEY,
  DEFAULT_CATALOG_LOCALE,
  isCatalogLocale,
  specialtyLabel,
  type CatalogLocale,
} from "@/lib/skills-catalog"

const LOCALE_BUTTONS: { id: CatalogLocale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "de", label: "DE" },
  { id: "nl", label: "NL" },
  { id: "fr", label: "FR" },
]

type CatalogLocaleState = {
  locale: CatalogLocale
  setLocale: (locale: CatalogLocale) => void
}

const CatalogLocaleContext = createContext<CatalogLocaleState>({
  locale: DEFAULT_CATALOG_LOCALE,
  setLocale: () => {},
})

export function CatalogLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<CatalogLocale>(DEFAULT_CATALOG_LOCALE)

  useEffect(() => {
    const saved = window.localStorage.getItem(CATALOG_LOCALE_STORAGE_KEY)
    if (isCatalogLocale(saved)) setLocaleState(saved)
  }, [])

  const setLocale = useCallback((next: CatalogLocale) => {
    setLocaleState(next)
    window.localStorage.setItem(CATALOG_LOCALE_STORAGE_KEY, next)
  }, [])

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale])
  return <CatalogLocaleContext.Provider value={value}>{children}</CatalogLocaleContext.Provider>
}

export function useCatalogLocale() {
  return useContext(CatalogLocaleContext)
}

export function useSpecialtyLabel() {
  const { locale } = useCatalogLocale()
  return useCallback((id: string) => specialtyLabel(id, locale), [locale])
}

export function CatalogLocaleSwitch() {
  const { locale, setLocale } = useCatalogLocale()
  return (
    <div
      role="group"
      aria-label="Occupation category language"
      data-testid="catalog-locale"
      className="inline-flex overflow-hidden rounded-md border border-border text-xs font-bold"
    >
      {LOCALE_BUTTONS.map((opt) => {
        const on = locale === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={on}
            data-testid={`catalog-locale-${opt.id}`}
            className={`px-2 py-1.5 ${on ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-mint"}`}
            onClick={() => setLocale(opt.id)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
