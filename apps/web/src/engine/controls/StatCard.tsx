'use client'

// ─── StatCard ──────────────────────────────────────────────────────────────────
// Renders a single labeled metric inside the simulation canvas ControlBar.
// Design spec: bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10
// Label: text-[10px] uppercase font-bold text-on-surface-variant
// Value: text-xl font-headline font-bold (optionally colored)

interface StatCardProps {
  label: string
  value: string | number
  /** Optional color accent for the value — 'primary' | 'secondary' | 'error' */
  accent?: 'primary' | 'secondary' | 'error'
}

export function StatCard({ label, value, accent }: StatCardProps) {
  const valueColor =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'secondary'
        ? 'text-secondary'
        : accent === 'error'
          ? 'text-error'
          : 'text-on-surface'

  return (
    <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 flex flex-col gap-1 min-w-[90px]">
      <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant leading-none">
        {label}
      </span>
      <span className={`text-xl font-headline font-bold tabular-nums leading-none ${valueColor}`}>
        {value}
      </span>
    </div>
  )
}
