import Link from 'next/link'
import { Cpu, FileCode2, Layers, ArrowRight, ArrowDown, Terminal } from 'lucide-react'

const TOOLS = [
  {
    href: '/dev/pipeline',
    icon: Cpu,
    iconClass: 'text-amber-400',
    badge: 'AI · 6 stages',
    title: 'Pipeline Playground',
    description:
      'Step through the full AI generation pipeline one stage at a time. Lock outputs to freeze upstream results, edit them inline, and replay downstream stages to iterate on prompts fast.',
    features: [
      'Run all 6 stages end-to-end',
      'Lock & replay individual stages',
      'Edit locked JSON in-place',
      'Send assembled scene to Studio',
    ],
    dotClass: 'bg-amber-400/60',
    accent: 'from-amber-400/10 to-transparent',
    accentBorder: 'border-amber-400/20 hover:border-amber-400/50',
    badgeClass: 'text-amber-400 bg-amber-400/10 border border-amber-400/20',
    ctaClass: 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/30',
  },
  {
    href: '/dev/scene',
    icon: FileCode2,
    iconClass: 'text-violet-400',
    badge: 'Preview · Session',
    title: 'Scene Studio',
    description:
      'Paste any Scene JSON and see it rendered live in the full simulation player. Edits persist in session storage so your work survives a refresh.',
    features: [
      'Syntax-checked JSON editor',
      'Live simulation preview',
      'Session-persisted across reloads',
      'Parse error reporting',
    ],
    dotClass: 'bg-violet-400/60',
    accent: 'from-violet-400/10 to-transparent',
    accentBorder: 'border-violet-400/20 hover:border-violet-400/50',
    badgeClass: 'text-violet-400 bg-violet-400/10 border border-violet-400/20',
    ctaClass: 'text-violet-400 bg-violet-400/10 hover:bg-violet-400/20 border-violet-400/30',
  },
  {
    href: '/dev/primitives',
    icon: Layers,
    iconClass: 'text-emerald-400',
    badge: 'Visual · DOM',
    title: 'Primitives Showcase',
    description:
      'Browse every visual primitive in isolation — arrays, trees, graphs, maps, grids, system diagrams — each with a live JSON editor so you can inspect and tweak state instantly.',
    features: [
      'All visual primitive types',
      'Per-primitive JSON editor',
      'Session-persisted state',
      'Canvas / WebGL renderer (coming)',
    ],
    dotClass: 'bg-emerald-400/60',
    accent: 'from-emerald-400/10 to-transparent',
    accentBorder: 'border-emerald-400/20 hover:border-emerald-400/50',
    badgeClass: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20',
    ctaClass: 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/30',
  },
]

const WORKFLOW = [
  { step: '1', label: 'Pipeline Playground', sub: 'Enter a topic, run the pipeline', href: '/dev/pipeline' },
  { step: '2', label: 'Scene Studio', sub: 'Preview the assembled Scene JSON', href: '/dev/scene' },
  { step: '3', label: 'Live Simulation', sub: 'Full animation & step-through', href: '/explore' },
]

export default function DevPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-12 space-y-16">

      {/* ── Hero ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
            Dev Tools
          </span>
        </div>
        <h1 className="font-headline font-extrabold text-4xl sm:text-5xl text-on-surface leading-tight">
          Build, inspect,<br className="hidden sm:block" /> iterate.
        </h1>
        <p className="text-base text-on-surface-variant max-w-xl leading-relaxed">
          Internal tooling for developing and debugging the Insyte generation pipeline —
          from raw topic input to a rendered simulation.
        </p>
      </div>

      {/* ── Tool cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={[
                'group relative flex flex-col rounded-xl border bg-surface-container-low transition-all duration-200',
                tool.accentBorder,
              ].join(' ')}
            >
              {/* Gradient accent */}
              <div className={`absolute inset-x-0 top-0 h-24 rounded-t-xl bg-gradient-to-b ${tool.accent} pointer-events-none`} />

              <div className="relative flex flex-col flex-1 p-6 gap-5">
                {/* Icon + badge row */}
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-highest">
                    <Icon className={`h-5 w-5 ${tool.iconClass}`} />
                  </div>
                  <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ${tool.badgeClass}`}>
                    {tool.badge}
                  </span>
                </div>

                {/* Title + description */}
                <div className="space-y-2">
                  <h2 className="font-headline font-bold text-lg text-on-surface leading-snug">
                    {tool.title}
                  </h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Feature list */}
                <ul className="space-y-1.5 flex-1">
                  {tool.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-on-surface-variant/70">
                      <span className={`h-1 w-1 rounded-full shrink-0 ${tool.dotClass}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={[
                  'flex items-center gap-1.5 self-start rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                  tool.ctaClass,
                ].join(' ')}>
                  Open
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Workflow ── */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-headline font-bold text-lg text-on-surface">How they connect</h2>
          <p className="text-sm text-on-surface-variant">
            The tools form a linear workflow from raw input to finished simulation.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {WORKFLOW.map((node, i) => (
            <div key={node.href} className="flex flex-col sm:flex-row items-center gap-3 flex-1">
              <Link
                href={node.href}
                className="flex-1 w-full rounded-lg border border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/40 hover:bg-surface-container transition-colors p-4 space-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                    {node.step}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">{node.label}</span>
                </div>
                <p className="text-xs text-on-surface-variant pl-7">{node.sub}</p>
              </Link>

              {i < WORKFLOW.length - 1 && (
                <div className="flex items-center justify-center shrink-0">
                  <ArrowRight className="hidden sm:block h-4 w-4 text-outline-variant/40" />
                  <ArrowDown className="sm:hidden h-4 w-4 text-outline-variant/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
