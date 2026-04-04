import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ExplanationSection } from '@insyte/scene-engine'

interface ExplanationPanelProps {
  sections: ExplanationSection[]
  currentStep: number
}

export function ExplanationPanel({ sections, currentStep }: ExplanationPanelProps) {
  // visible sections are those whose appearsAtStep <= currentStep
  const visibleSections = sections.filter((s) => s.appearsAtStep <= currentStep)
  // Active section is typically the last visible one that matches nearest to current step
  const activeSectionIdx = visibleSections.length > 0 ? visibleSections.length - 1 : -1

  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentStep, visibleSections.length])

  return (
    <div className="w-[35%] min-w-0 overflow-y-auto p-6 border-r border-outline-variant/20 flex flex-col gap-6 custom-scrollbar">
      <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
        Explanation
      </p>
      
      {visibleSections.map((section, idx) => {
        const isActive = idx === activeSectionIdx

        return (
          <div
            key={idx}
            ref={isActive ? activeRef : null}
            className={`transition-opacity duration-500 pl-4 border-l-2 ${
              isActive ? 'border-primary opacity-100' : 'border-outline-variant/20 opacity-60'
            }`}
          >
            <h3 className="text-sm font-bold text-on-surface mb-2 tracking-wide font-headline">
              {section.heading}
            </h3>
            
            <div className="text-sm text-on-surface-variant leading-relaxed font-body prose prose-invert prose-p:mb-2 prose-a:text-primary max-w-none">
              <ReactMarkdown>{section.body}</ReactMarkdown>
            </div>

            {section.callout && (
              <div className="mt-4 bg-primary/10 rounded-lg p-3 text-sm text-on-surface border border-primary/20 shadow-inner">
                <span className="font-bold text-primary mr-1">▸ Try this:</span>
                {section.callout}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
