'use client'

import { useEffect, useState, useRef } from 'react'
import type { SceneCode } from '@insyte/scene-engine'
// Dynamically imported so it runs properly in browser
import { createHighlighter } from 'shiki/bundle/web'
import { Copy, Check } from 'lucide-react'

interface CodePanelProps {
  code: SceneCode
  currentStep: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let highlighterInstance: any = null

export function CodePanel({ code, currentStep }: CodePanelProps) {
  const [html, setHtml] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeLine = code.highlightByStep[currentStep] ?? -1

  useEffect(() => {
    async function initAndHighlight() {
      if (!highlighterInstance) {
        highlighterInstance = await createHighlighter({
          themes: ['vitesse-dark'],
          langs: ['javascript', 'python', 'typescript'],
        })
      }

      const rawHtml = highlighterInstance.codeToHtml(code.source, {
        lang: code.language,
        theme: 'vitesse-dark',
      })
      setHtml(rawHtml)
    }

    initAndHighlight()
  }, [code.source, code.language])

  // Scroll active line into view when html is ready or active changes
  useEffect(() => {
    if (activeLine >= 0 && containerRef.current && html) {
      // Shiki places lines in <span class="line"> elements
      const lines = containerRef.current.querySelectorAll('.line')
      if (lines[activeLine]) {
        // Clear old highlights
        lines.forEach((l) => {
          ;(l as HTMLElement).style.backgroundColor = 'transparent'
          ;(l as HTMLElement).style.boxShadow = 'none'
          ;(l as HTMLElement).style.width = '100%'
          ;(l as HTMLElement).style.display = 'inline-block'
        })
        const activeNode = lines[activeLine] as HTMLElement
        // Highlight current
        activeNode.style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 12%, transparent)' // primary glow
        activeNode.style.boxShadow = 'inset 3px 0 0 var(--color-primary)'
        
        activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeLine, html])

  const copyCode = async () => {
    await navigator.clipboard.writeText(code.source)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-[35%] min-w-0 overflow-y-auto p-6 border-r border-outline-variant/20 bg-[var(--color-surface)] flex flex-col relative custom-scrollbar">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-[var(--color-surface)] z-10 pb-2 border-b border-outline-variant/10">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
          Code
        </p>
        <button
          onClick={copyCode}
          className="p-1.5 rounded-md hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} className="text-secondary" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="font-mono text-sm leading-relaxed" ref={containerRef}>
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} className="shiki-container w-full" />
        ) : (
          <div className="flex animate-pulse flex-col gap-2 opacity-50">
            <div className="h-4 bg-outline-variant w-3/4 rounded" />
            <div className="h-4 bg-outline-variant w-1/2 rounded" />
            <div className="h-4 bg-outline-variant w-5/6 rounded" />
          </div>
        )}
      </div>
      
      {/* Add global styles to fix shiki display block for full-width highlights */}
      <style>{`
        .shiki-container pre {
          overflow-x: auto;
          margin: 0;
          padding-bottom: 2rem;
          background: transparent !important;
        }
        .shiki-container code {
          display: block;
          min-width: max-content;
        }
        .shiki-container .line {
          padding-left: 12px;
          padding-right: 12px;
        }
      `}</style>
    </div>
  )
}
