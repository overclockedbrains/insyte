'use client'

import { motion } from 'framer-motion'

// ─── StreamingSkeleton ────────────────────────────────────────────────────────
// Full-page skeleton shown while the AI stream hasn't produced an activeScene yet.

interface StreamingSkeletonProps {
  topic: string
  isStreaming: boolean
  streamedFields: Set<string>
  error: string | null
}

export function StreamingSkeleton({
  topic,
  isStreaming,
  streamedFields,
  error,
}: StreamingSkeletonProps) {
  return (
    <div className="h-[calc(100vh-3.5rem)] flex">

      {/* Left panel (35%) — hidden on mobile */}
      <div className="hidden md:flex w-[35%] flex-col gap-4 p-6 border-r border-outline-variant/20">
        <div className="space-y-2">
          <Shimmer className="h-5 w-3/4 rounded-lg" />
          <Shimmer className="h-4 w-1/2 rounded-lg" />
        </div>
        <div className="mt-4 space-y-3">
          <Shimmer className="h-4 w-full rounded" />
          <Shimmer className="h-4 w-5/6 rounded" />
          <Shimmer className="h-4 w-4/5 rounded" />
          <Shimmer className="h-4 w-3/4 rounded" />
        </div>
        <div className="mt-6 space-y-3">
          <Shimmer className="h-4 w-full rounded" />
          <Shimmer className="h-4 w-5/6 rounded" />
          <Shimmer className="h-4 w-2/3 rounded" />
        </div>
        <div className="mt-auto">
          <StreamingStatus
            topic={topic}
            isStreaming={isStreaming}
            streamedFields={streamedFields}
            error={error}
          />
        </div>
      </div>

      {/* Canvas area (65%) */}
      <div className="flex-1 flex flex-col gap-4 p-6">
        {/* Title — mobile only */}
        <div className="md:hidden space-y-2 mb-2">
          <Shimmer className="h-5 w-2/3 rounded-lg" />
        </div>

        {/* Playback controls row */}
        <div className="flex items-center gap-3 mb-2">
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-2 flex-1 rounded-full" />
          <Shimmer className="h-6 w-12 rounded-lg" />
        </div>

        {/* Canvas ghost */}
        <div className="flex-1 relative rounded-2xl bg-surface-container-low border border-outline-variant/20 overflow-hidden">
          <GridDots />
          <GhostNode className="absolute top-[15%] left-[20%] w-32 h-12" />
          <GhostNode className="absolute top-[15%] left-[55%] w-28 h-12" delay={0.1} />
          <GhostNode className="absolute top-[45%] left-[30%] w-40 h-14" delay={0.2} />
          <GhostNode className="absolute top-[70%] left-[15%] w-24 h-10" delay={0.15} />
          <GhostNode className="absolute top-[70%] left-[60%] w-24 h-10" delay={0.25} />
          <GeneratingLabel isStreaming={isStreaming} streamedFields={streamedFields} />
        </div>

        {/* Bottom controls row */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex flex-col gap-1.5 flex-1">
            <Shimmer className="h-3 w-20 rounded" />
            <Shimmer className="h-3 w-full rounded-full" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <Shimmer className="h-3 w-16 rounded" />
            <Shimmer className="h-3 w-full rounded-full" />
          </div>
          <Shimmer className="h-8 w-20 rounded-lg" />
        </div>
      </div>

    </div>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse bg-surface-container-high ${className}`} />
}

function GhostNode({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`rounded-xl border border-outline-variant/30 bg-surface-container/60 ${className}`}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

function GridDots() {
  return (
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(183,159,255,0.15) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  )
}

function GeneratingLabel({ isStreaming, streamedFields }: { isStreaming: boolean; streamedFields: Set<string> }) {
  const fieldsDone = streamedFields.size
  const totalFields = 7 // Title, Type, Layout, Visuals, Steps, Controls, Explanation, Popups (approx 7 major ones)
  
  const text = !isStreaming 
    ? 'Starting generation...' 
    : fieldsDone === 0
      ? 'AI is thinking and planning the simulation...'
      : `Streaming data (${Math.min(fieldsDone, totalFields)}/${totalFields} modules complete)...`

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface-container/80 backdrop-blur-sm px-5 py-2.5 rounded-full border border-outline-variant/30 shadow-md">
      <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(183,159,255,0.6)]" />
      <span className="text-sm text-on-surface font-medium truncate max-w-[250px] sm:max-w-none">
        {text}
      </span>
    </div>
  )
}

function StreamingStatus({
  topic,
  isStreaming,
  streamedFields,
  error,
}: {
  topic: string
  isStreaming: boolean
  streamedFields: Set<string>
  error: string | null
}) {
  if (error && isStreaming) {
    return <p className="text-sm font-medium text-error animate-pulse">{error}</p>
  }

  const fields = Array.from(streamedFields)
  if (fields.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-on-surface-variant/90">
          Building &ldquo;{topic}&rdquo;
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {fields.map((f) => (
            <motion.span
              key={f}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold tracking-wide uppercase shadow-sm border border-primary/20"
            >
              {f} ✓
            </motion.span>
          ))}
        </div>
      </div>
    )
  }

  if (isStreaming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-on-surface-variant/90 animate-pulse">
          Contacting AI for &ldquo;{topic}&rdquo;...
        </p>
        <p className="text-[11px] text-on-surface-variant/60 leading-relaxed max-w-[90%]">
          The AI model is deeply processing your request and reasoning about the visual representation. This thinking phase may take up to a minute...
        </p>
      </div>
    )
  }

  return null
}
