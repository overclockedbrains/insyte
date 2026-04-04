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
  const { entries = [], label } = state as HashMapState

  return (
    <div className="flex flex-col items-center justify-center p-4 min-w-[240px]">
      {label && (
        <div className="text-xs font-mono uppercase tracking-widest text-on-surface-variant font-bold mb-3">
          {label}
        </div>
      )}

      <div className="w-full flex-col flex rounded-xl border border-outline-variant/30 overflow-hidden bg-surface-container-lowest">
        <div className="flex w-full bg-surface-container border-b border-outline-variant/30 text-xs font-mono text-on-surface-variant font-bold uppercase">
          <div className="flex-1 p-2 text-center border-r border-outline-variant/30">Key</div>
          <div className="flex-1 p-2 text-center">Value</div>
        </div>

        <div className="relative flex flex-col w-full min-h-[40px]">
          <AnimatePresence initial={false}>
            {entries.length === 0 ? (
              <motion.div
                key="empty"
                className="absolute inset-0 flex items-center justify-center text-on-surface-variant font-mono opacity-50 text-sm italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
              >
                {`{ }`}
              </motion.div>
            ) : (
              entries.map((entry) => {
                let bgColor = 'transparent'
                let shadow = 'none'

                if (entry.highlight === 'hit') {
                  bgColor = 'rgba(58, 223, 250, 0.15)' // secondary
                  shadow = '0 0 12px rgba(58,223,250,0.6)'
                } else if (entry.highlight === 'miss') {
                  bgColor = 'rgba(255, 110, 132, 0.15)' // error
                  shadow = 'inset 0 0 8px rgba(255, 110, 132, 0.4)'
                } else if (entry.highlight === 'insert') {
                  bgColor = 'rgba(183, 159, 255, 0.15)' // primary
                  shadow = '0 0 12px rgba(183,159,255,0.4)'
                }

                return (
                  <motion.div
                    key={`${id}-entry-${entry.key}`}
                    layout
                    initial={{ opacity: 0, y: -20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor: bgColor,
                      boxShadow: shadow,
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex w-full border-b border-outline-variant/10 last:border-b-0 font-mono text-sm relative z-10"
                  >
                    <div className="flex-1 p-2 text-center border-r border-outline-variant/10 text-tertiary">
                      {entry.key}
                    </div>
                    <div className="flex-1 p-2 text-center text-on-surface truncate">
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
