'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBoundStore } from '@/src/stores/store'
import { THEMES } from '@/src/stores/slices/theme-slice'

const DARK_THEMES  = THEMES.filter((t) => t.mode === 'dark')
const LIGHT_THEMES = THEMES.filter((t) => t.mode === 'light')

export function ThemeSwitcher({ className }: { className?: string }) {
  const theme    = useBoundStore((s) => s.theme)
  const setTheme = useBoundStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = THEMES.find((t) => t.name === theme) ?? THEMES[0]!

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Trigger — gradient dot reflecting active theme */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={className}
        title={`Theme: ${active.label}`}
        aria-label="Theme switcher"
        aria-expanded={open}
      >
        <span
          className="h-3.5 w-3.5 rounded-full ring-2 ring-outline-variant/30 shrink-0 block"
          style={{ background: `linear-gradient(135deg, ${active.primary}, ${active.secondary})` }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 z-50 w-52 origin-top-right"
          >
            <div className="rounded-2xl border border-outline-variant/25 bg-surface-container shadow-2xl overflow-hidden">

              {/* Dark themes */}
              <div className="px-3 pt-3 pb-1">
                <div className="flex items-center gap-1.5 px-0.5 pb-1.5">
                  <Moon className="h-3 w-3 text-on-surface-variant/50" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/50 select-none">
                    Dark
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  {DARK_THEMES.map((t) => (
                    <ThemeRow key={t.name} t={t} active={theme === t.name} onSelect={() => { setTheme(t.name); setOpen(false) }} />
                  ))}
                </div>
              </div>

              <div className="mx-3 my-1.5 h-px bg-outline-variant/20" />

              {/* Light themes */}
              <div className="px-3 pb-3 pt-1">
                <div className="flex items-center gap-1.5 px-0.5 pb-1.5">
                  <Sun className="h-3 w-3 text-on-surface-variant/50" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/50 select-none">
                    Light
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  {LIGHT_THEMES.map((t) => (
                    <ThemeRow key={t.name} t={t} active={theme === t.name} onSelect={() => { setTheme(t.name); setOpen(false) }} />
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ThemeRow({
  t,
  active,
  onSelect,
}: {
  t: (typeof THEMES)[number]
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group flex items-center gap-3 w-full px-2 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer outline-none',
        active
          ? 'bg-on-surface/8 text-on-surface'
          : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface',
      ].join(' ')}
    >
      {/* Gradient swatch */}
      <span
        className="h-6 w-6 rounded-lg shrink-0 ring-1 ring-outline-variant/30"
        style={{ background: `linear-gradient(135deg, ${t.primary} 0%, ${t.secondary} 100%)` }}
      />

      <span className="flex-1 text-left text-[13px] tracking-tight">{t.label}</span>

      {/* Active check */}
      {active && (
        <span
          className="shrink-0 h-4 w-4 rounded-full flex items-center justify-center"
          style={{ background: t.primary + '25', color: t.primary }}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
