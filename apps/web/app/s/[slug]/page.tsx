import { notFound } from 'next/navigation'
import { parseScene } from '@insyte/scene-engine'
import { SimulationPageClient } from './SimulationPageClient'

// ─── Static params (pre-built scenes) ────────────────────────────────────────

export async function generateStaticParams() {
  return [{ slug: 'test' }]
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadScene(slug: string) {
  // In Phase 5 this will support all pre-built scenes.
  // For Phase 2 we only wire the test scene.
  if (slug === 'test') {
    const json = await import('@/src/content/scenes/test/minimal.json')
    return parseScene(json.default)
  }
  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SimulationPage({ params }: Props) {
  const { slug } = await params
  const scene = await loadScene(slug)

  if (!scene) {
    notFound()
  }

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-8rem)]">
      {/* Sticky title bar */}
      <header className="sticky top-0 z-20 bg-surface-container-low/80 backdrop-blur border-b border-outline-variant/20 px-6 py-3 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-on-surface truncate">{scene.title}</h1>
        {scene.category && (
          <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {scene.category}
          </span>
        )}
      </header>

      {/* Simulation canvas — client component owns store wiring */}
      <div className="flex-1 overflow-hidden">
        <SimulationPageClient scene={scene} />
      </div>
    </div>
  )
}
