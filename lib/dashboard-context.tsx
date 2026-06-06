'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { DashboardData } from './types'
import { createT, type Lang } from './i18n'

type Mode = 'public' | 'full'

interface Ctx {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  selectedDate: string | null
  setSelectedDate: (d: string | null) => void
  lang: Lang
  setLang: (l: Lang) => void
  mode: Mode
  setMode: (m: Mode) => void
  t: (key: string) => string
}

const DashboardContext = createContext<Ctx | null>(null)

function updateParam(key: string, value: string) {
  const params = new URLSearchParams(window.location.search)
  params.set(key, value)
  window.history.replaceState({}, '', `?${params.toString()}`)
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [lang, setLangState] = useState<Lang>('fr')
  const [mode, setModeState] = useState<Mode>('public')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlLang = params.get('lang')
    const urlMode = params.get('mode')
    if (urlLang === 'en' || urlLang === 'fr') setLangState(urlLang)
    if (urlMode === 'public' || urlMode === 'full') setModeState(urlMode)
  }, [])

  useEffect(() => {
    fetch('/data.json')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`)
        return r.json()
      })
      .then((d: DashboardData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    updateParam('lang', l)
  }

  function setMode(m: Mode) {
    setModeState(m)
    updateParam('mode', m)
  }

  const t = createT(lang)

  return (
    <DashboardContext.Provider value={{ data, isLoading, error, selectedDate, setSelectedDate, lang, setLang, mode, setMode, t }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard outside provider')
  return ctx
}
