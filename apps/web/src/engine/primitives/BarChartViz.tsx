'use client'

import { motion } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight } from '../styles/colors'
import { useThemeSync } from '../styles/useThemeSync'

interface ChartBar {
  id: string
  value: number
  label?: string
  highlight?: string
}

interface ChartState {
  bars: ChartBar[]
  maxValue?: number
}

const BAR_WIDTH = 40
const MAX_BAR_HEIGHT = 200

export function BarChartViz({ state }: PrimitiveProps) {
  useThemeSync()
  const { bars = [], maxValue } = state as ChartState

  if (bars.length === 0) {
    return (
      <div className="flex items-center justify-center w-full min-h-[240px] text-sm text-on-surface-variant/50 italic">
        Empty chart
      </div>
    )
  }

  const effectiveMax = maxValue ?? Math.max(...bars.map(b => b.value), 1)

  return (
    <div className="flex items-end justify-center gap-2 w-full" style={{ minHeight: MAX_BAR_HEIGHT + 48, padding: '24px 16px 8px' }}>
      {bars.map((bar) => {
        const barHeight = Math.max(4, (bar.value / effectiveMax) * MAX_BAR_HEIGHT)
        const colors = resolveHighlight(bar.highlight)

        return (
          <div key={bar.id} className="flex flex-col items-center" style={{ width: BAR_WIDTH, gap: 4 }}>
            {/* Value label above bar */}
            <motion.div
              style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: colors.border, minHeight: 16, textAlign: 'center' }}
              animate={{ color: colors.border }}
              transition={{ duration: 0.2 }}
            >
              {bar.value}
            </motion.div>
            {/* Bar */}
            <motion.div
              style={{
                width: BAR_WIDTH,
                borderRadius: '4px 4px 0 0',
                border: `2px solid ${colors.border}`,
              }}
              animate={{
                height: barHeight,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                boxShadow: bar.highlight && bar.highlight !== 'default'
                  ? `0 0 12px ${colors.border}60`
                  : 'none',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            {/* Item label below bar */}
            {bar.label && (
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--color-on-surface-variant)', textAlign: 'center', marginTop: 4 }}>
                {bar.label}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
