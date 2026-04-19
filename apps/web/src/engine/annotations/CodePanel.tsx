'use client'

import { useEffect, useState, useRef } from 'react'
import type { SceneCode } from '@insyte/scene-engine'
import { createHighlighter } from 'shiki/bundle/web'
import { Copy, Check } from 'lucide-react'

type WebHighlighter = Awaited<ReturnType<typeof createHighlighter>>

interface CodePanelProps {
  code: SceneCode
  currentStep: number
}

let highlighterInstance: WebHighlighter | null = null
let initializingPromise: Promise<WebHighlighter> | null = null

export function CodePanel({ code, currentStep }: CodePanelProps) {
  const [html, setHtml] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeLine = code.highlightByStep[currentStep] ?? -1

  useEffect(() => {
    async function initAndHighlight() {
      if (!highlighterInstance) {
        if (!initializingPromise) {
          initializingPromise = createHighlighter({
            themes: ['vitesse-dark'],
            langs: ['javascript', 'python', 'typescript'],
          })
        }
        highlighterInstance = await initializingPromise
      }
      const rawHtml = highlighterInstance.codeToHtml(code.source, {
        lang: code.language,
        theme: 'vitesse-dark',
      })
      setHtml(rawHtml)
    }
    initAndHighlight()
  }, [code.source, code.language])

  useEffect(() => {
    if (activeLine >= 0 && containerRef.current && html) {
      const lines = containerRef.current.querySelectorAll('.line')
      lines.forEach((l) => {
        ;(l as HTMLElement).style.backgroundColor = 'transparent'
        ;(l as HTMLElement).style.boxShadow = 'none'
        ;(l as HTMLElement).style.display = 'inline-block'
        ;(l as HTMLElement).style.width = '100%'
      })
      if (lines[activeLine]) {
        const activeNode = lines[activeLine] as HTMLElement
        activeNode.style.backgroundColor = 'rgba(183, 159, 255, 0.1)'
        activeNode.style.boxShadow = 'inset 2px 0 0 #b79fff'
        activeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [activeLine, html])

  const copyCode = async () => {
    await navigator.clipboard.writeText(code.source)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[11px] font-mono uppercase tracking-widest text-on-surface-variant font-semibold">
          Code
        </span>
        <button
          onClick={copyCode}
          className="p-1 rounded hover:bg-surface-container transition-colors text-on-surface-variant/50 hover:text-on-surface-variant"
          aria-label="Copy code"
        >
          {copied ? <Check size={12} className="text-secondary" /> : <Copy size={12} />}
        </button>
      </div>

      {/* Code block */}
      <div
        ref={containerRef}
        className="px-1 pb-3 overflow-x-auto"
      >
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} className="shiki-wrap" />
        ) : (
          <div className="px-4 flex flex-col gap-2 opacity-30 animate-pulse">
            <div className="h-3 bg-outline-variant rounded w-3/4" />
            <div className="h-3 bg-outline-variant rounded w-1/2" />
            <div className="h-3 bg-outline-variant rounded w-5/6" />
          </div>
        )}
      </div>

      <style>{`
        .shiki-wrap pre {
          margin: 0;
          padding: 0;
          background: transparent !important;
          font-size: 11px;
          line-height: 1.7;
          overflow-x: auto;
        }
        .shiki-wrap code {
          display: block;
          min-width: max-content;
        }
        .shiki-wrap .line {
          padding-left: 16px;
          padding-right: 16px;
        }
      `}</style>
    </div>
  )
}
