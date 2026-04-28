import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

interface ExplanationEntry {
  appearsAtStep: number
  heading: string
  body: string
  callout?: string
}

interface ExplanationPanelProps {
  sections: ExplanationEntry[]
  currentStep: number
  description?: string
  compact?: boolean
}

export function ExplanationPanel({ sections, currentStep, description, compact = false }: ExplanationPanelProps) {
  const visibleSections = sections.filter((s) => s.appearsAtStep <= currentStep)
  const activeSectionIdx = visibleSections.length > 0 ? visibleSections.length - 1 : -1
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentStep, visibleSections.length])

  if (sections.length === 0) return null

  return (
    <div className="flex flex-col min-h-0">
      {/* Steps */}
      <div className="flex flex-col px-5 pt-5 pb-6 gap-0">
        {compact ? (
          <span className="text-[11px] font-mono uppercase tracking-widest text-on-surface-variant font-semibold mb-5 block">
            Explanation
          </span>
        ) : (
          <div className="mb-6">
            <h2 className="text-[28px] font-bold text-on-surface leading-tight tracking-tight">
              Explanation
            </h2>
            {description && (
              <p className="mt-2 text-[13px] text-on-surface-variant/70 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}
        {visibleSections.length === 0 ? (
          <p className="text-[12px] text-on-surface-variant/40 italic pl-3 border-l-2 border-outline-variant/15">
            Step through to reveal explanations.
          </p>
        ) : (
          visibleSections.map((section, idx) => {
            const isActive = idx === activeSectionIdx
            const isLast = idx === visibleSections.length - 1
            return (
              <div
                key={idx}
                ref={isActive ? activeRef : null}
                className={`flex gap-3 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-50'}`}
              >
                {/* Timeline column: small dot + connecting line */}
                <div className="flex flex-col items-center flex-shrink-0 w-3 pt-[3px]">
                  <div
                    className={[
                      'w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500',
                      isActive ? 'bg-primary' : 'bg-outline-variant/50',
                    ].join(' ')}
                    style={isActive ? { boxShadow: '0 0 8px var(--color-primary-alpha-60)' } : undefined}
                  />
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[20px] mt-1.5 bg-outline-variant/25" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex flex-col gap-1.5 pb-6 flex-1 min-w-0">
                  <h3
                    className={[
                      'text-[13px] font-semibold leading-snug transition-colors duration-500',
                      isActive ? 'text-primary' : 'text-on-surface',
                    ].join(' ')}
                  >
                    {section.heading}
                  </h3>
                  <div className="text-[12px] text-on-surface-variant leading-relaxed prose prose-invert prose-p:mb-1.5 prose-strong:text-on-surface prose-a:text-primary max-w-none">
                    <ReactMarkdown>{section.body}</ReactMarkdown>
                  </div>
                  {section.callout && (
                    <div className="mt-2 flex gap-2 items-start bg-primary/8 rounded px-3 py-2.5 border border-primary/20 text-[11px] text-on-surface">
                      <span className="font-bold text-primary shrink-0 mt-px">▸</span>
                      <span className="leading-relaxed">{section.callout}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
