import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'

interface HashMapState {
  entries: {
    key: string
    value: string
    highlight?: 'insert' | 'hit' | 'miss' | 'delete'
  }[]
  label?: string
}

export function HashMapViz({ id, state }: PrimitiveProps) {
  const { entries = [] } = state as HashMapState

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full flex-col flex rounded border border-outline-variant/25 overflow-hidden">
        {/* Header row */}
        <div className="flex w-full bg-surface-container border-b border-outline-variant/30 text-[11px] font-mono text-on-surface-variant/70 uppercase tracking-wider">
          <div className="flex-1 px-3 py-1.5 border-r border-outline-variant/20">Key</div>
          <div className="flex-1 px-3 py-1.5">Value</div>
        </div>

        {/* Rows */}
        <div className="relative flex flex-col w-full min-h-[40px] bg-surface">
          <AnimatePresence initial={false}>
            {entries.length === 0 ? (
              <motion.div
                key="empty"
                className="flex items-center justify-center py-4 text-on-surface-variant/40 font-mono text-sm italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {'{ }'}
              </motion.div>
            ) : (
              entries.map((entry, i) => {
                let bgColor = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0)'
                let borderLeft = '3px solid transparent'

                if (entry.highlight === 'hit') {
                  bgColor = 'rgba(58, 223, 250, 0.08)'
                  borderLeft = '3px solid rgba(58, 223, 250, 0.6)'
                } else if (entry.highlight === 'miss') {
                  bgColor = 'rgba(255, 110, 132, 0.08)'
                  borderLeft = '3px solid rgba(255, 110, 132, 0.6)'
                } else if (entry.highlight === 'insert') {
                  bgColor = 'rgba(183, 159, 255, 0.1)'
                  borderLeft = '3px solid rgba(183, 159, 255, 0.6)'
                } else if (entry.highlight === 'delete') {
                  bgColor = 'rgba(255, 110, 132, 0.06)'
                  borderLeft = '3px solid rgba(255, 110, 132, 0.4)'
                }

                return (
                  <motion.div
                    key={`${id}-entry-${entry.key}`}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{
                      opacity: entry.highlight === 'delete' ? 0.45 : 1,
                      x: 0,
                      backgroundColor: bgColor,
                    }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="flex w-full border-b border-outline-variant/10 last:border-b-0 font-mono text-sm"
                    style={{ borderLeft }}
                  >
                    <div className="flex-1 px-3 py-2 border-r border-outline-variant/10 text-on-surface/80 text-[13px]">
                      {entry.key}
                    </div>
                    <div className={`flex-1 px-3 py-2 text-[13px] truncate ${entry.highlight === 'delete' ? 'text-on-surface/40 line-through' : 'text-on-surface'}`}>
                      {entry.value}
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
