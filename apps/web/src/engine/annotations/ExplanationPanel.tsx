import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ExplanationSection } from '@insyte/scene-engine'

interface ExplanationPanelProps {
  sections: ExplanationSection[]
  currentStep: number
}

export function ExplanationPanel({ sections, currentStep }: ExplanationPanelProps) {
  const visibleSections = sections.filter((s) => s.appearsAtStep <= currentStep)
  const activeSectionIdx = visibleSections.length > 0 ? visibleSections.length - 1 : -1
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentStep, visibleSections.length])

  if (sections.length === 0) return null

  if (visibleSections.length === 0) {
    return (
      <div className="flex flex-col px-4 pb-6 gap-4">
        <span className="text-[11px] font-mono uppercase tracking-widest text-on-surface-variant font-semibold pt-1">
          Explanation
        </span>
        <p className="text-[12px] text-on-surface-variant/40 italic pl-3 border-l-2 border-outline-variant/15">
          Step through to reveal explanations.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-4 pb-6 gap-4">
      <span className="text-[11px] font-mono uppercase tracking-widest text-on-surface-variant font-semibold pt-1">
        Explanation
      </span>

      {visibleSections.map((section, idx) => {
        const isActive = idx === activeSectionIdx
        return (
          <div
            key={idx}
            ref={isActive ? activeRef : null}
            className={`flex flex-col gap-1.5 pl-3 border-l-2 transition-all duration-500 ${
              isActive
                ? 'border-primary/70 opacity-100'
                : 'border-outline-variant/15 opacity-40'
            }`}
          >
            <h3 className="text-[13px] font-semibold text-on-surface leading-snug">
              {section.heading}
            </h3>
            <div className="text-[12px] text-on-surface-variant leading-relaxed prose prose-invert prose-p:mb-1.5 prose-strong:text-on-surface prose-a:text-primary max-w-none">
              <ReactMarkdown>{section.body}</ReactMarkdown>
            </div>
            {section.callout && (
              <div className="mt-2 bg-primary/8 rounded px-3 py-2 text-[11px] text-on-surface border border-primary/15">
                <span className="font-semibold text-primary mr-1">▸</span>
                {section.callout}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
