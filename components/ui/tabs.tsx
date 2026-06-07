'use client'
import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

interface TabsCtx {
  value: string
  onValueChange: (v: string) => void
}

const TabsContext = createContext<TabsCtx | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs subcomponent used outside <Tabs>')
  return ctx
}

function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internal, setInternal] = useState(defaultValue ?? '')
  const value = controlledValue ?? internal
  const handleChange = (v: string) => {
    setInternal(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-end gap-0 border-b border-slate-200',
        className
      )}
    >
      {children}
    </div>
  )
}

function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useTabs()
  const active = ctx.value === value
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap',
        'px-5 py-3 text-[14px] font-bold tracking-wide uppercase',
        'border-b-2 -mb-px transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006EB6]',
        active
          ? 'border-[#006EB6] text-[#1A1F2E]'
          : 'border-transparent text-slate-500 hover:text-slate-600',
        className
      )}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useTabs()
  if (ctx.value !== value) return null
  return (
    <div role="tabpanel" className={cn('mt-5', className)}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
