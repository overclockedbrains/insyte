'use client'

import { useState, useEffect } from 'react'
import { X, ArrowUpRight, Wrench } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SESSION_KEY = 'insyte_dev_notice_v2'

type State = 'hidden' | 'card' | 'fab'

export function DevBanner() {
  const [state, setState] = useState<State>('hidden')

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setState('fab')
    } else {
      const t = setTimeout(() => setState('card'), 900)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setState('fab')
  }

  return (
    <>
      <AnimatePresence>
        {state === 'card' && (
          <motion.div
            key="dev-card"
            className="fixed bottom-6 left-6 z-[90] w-80 max-w-[calc(100vw-3rem)]"
            initial={{ opacity: 0, y: 28, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92, transition: { duration: 0.2, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          >
            <div
              className="rounded-2xl p-px"
              style={{
                background: 'linear-gradient(135deg, #b79fff 0%, #919bff 45%, #3adffa 100%)',
                boxShadow:
                  '0 0 0 1px rgba(183,159,255,0.08), 0 0 55px -8px rgba(183,159,255,0.28), 0 0 28px -12px rgba(58,223,250,0.18), 0 28px 52px -16px rgba(0,0,0,0.75)',
              }}
            >
              <div className="rounded-2xl bg-[#0c0c11] backdrop-blur-2xl p-5 relative overflow-hidden">

                <div
                  className="absolute -top-14 -left-14 h-40 w-40 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(183,159,255,0.16) 0%, transparent 68%)' }}
                />
                <div
                  className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(58,223,250,0.11) 0%, transparent 68%)' }}
                />

                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <div className="mb-4 flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 rounded-full px-2.5 py-[5px]">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-65" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                      Early Build
                    </span>
                  </div>
                </div>

                <p className="text-[15px] font-bold leading-snug mb-2 pr-5 text-white/90">
                  Still baking,{' '}
                  <span
                    style={{
                      background: 'linear-gradient(90deg, #b79fff 0%, #3adffa 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    open for visitors.
                  </span>
                </p>

                <p className="text-[12px] leading-relaxed text-white/35 mb-5">
                  Active dev territory — you might hit a rough edge. Every bug report genuinely helps shape this.
                </p>

                <div
                  className="h-px mb-4"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(183,159,255,0.25) 0%, rgba(58,223,250,0.15) 60%, transparent 100%)',
                  }}
                />

                <a
                  href="mailto:125aryaaman@gmail.com"
                  className="group flex items-center justify-between gap-4 w-full px-3.5 py-2.5 rounded-xl text-[12px] font-semibold bg-primary/[0.07] border border-primary/15 hover:bg-primary/[0.13] hover:border-primary/30 transition-all duration-200"
                >
                  <span className="text-primary/75 group-hover:text-primary transition-colors duration-150">
                    Found something broken? Tell me.
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-primary/45 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state === 'fab' && (
          <motion.button
            key="dev-fab"
            type="button"
            onClick={() => setState('card')}
            title="About this build"
            aria-label="About this build"
            className="fixed bottom-6 left-6 z-[90] h-9 w-9 rounded-full bg-[#0c0c11] border border-white/[0.08] flex items-center justify-center text-white/25 hover:text-white/55 hover:border-white/15 transition-colors duration-200"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <Wrench className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
