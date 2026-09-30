"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { availabilityLabel, type Availability } from "@/lib/availability"
import { countryLabel } from "@/lib/country"
import {
  CATALOG_LOCALE_BUTTONS,
  CATALOG_LOCALE_STORAGE_KEY,
  DEFAULT_CATALOG_LOCALE,
  isCatalogLocale,
  type CatalogLocale,
} from "@/lib/locales"
import { specialtyLabel } from "@/lib/skills-catalog"
import { uiCopy, type UiKey } from "@/lib/ui-copy"

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

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

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

export function useCountryLabel() {
  const { locale } = useCatalogLocale()
  return useCallback((iso2: string) => countryLabel(iso2, locale), [locale])
}

export function useAvailabilityLabel() {
  const { locale } = useCatalogLocale()
  return useCallback((id: Availability) => availabilityLabel(id, locale), [locale])
}

export function useUiCopy() {
  const { locale } = useCatalogLocale()
  return useCallback((key: UiKey) => uiCopy(locale, key), [locale])
}

export function CatalogLocaleSwitch() {
  const { locale, setLocale } = useCatalogLocale()
  return (
    <div
      role="group"
      aria-label="Catalog language"
      data-testid="catalog-locale"
      className="inline-flex max-w-full shrink-0 flex-wrap overflow-hidden rounded-md border border-border text-xs font-bold"
    >
      {CATALOG_LOCALE_BUTTONS.map((opt) => {
        const on = locale === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={on}
            data-testid={`catalog-locale-${opt.id}`}
            className={`px-1.5 py-1.5 sm:px-2 ${on ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-mint"}`}
            onClick={() => setLocale(opt.id)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
