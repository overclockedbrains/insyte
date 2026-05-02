'use client'

import { useEffect, useRef } from 'react'
import type { SceneRendererProps } from '../types'
import { useCanvas } from '@/src/engine/CanvasContext'
import { getLiveCanvasPanel } from '@/src/engine/styles/colors'
import { useThemeSync } from '@/src/engine/styles/useThemeSync'

/**
 * CanvasRenderer — stub implementation of SceneRendererProps.
 *
 * Placeholder for a future canvas-based renderer (Konva / WebGL / PixiJS).
 * Satisfies the SceneRendererProps contract so it can be swapped in via
 * NEXT_PUBLIC_RENDERER=canvas without touching any code above CanvasCard.
 *
 * When building for real: replace this file's body with Konva/WebGL rendering.
 * The interface (SceneRendererProps) must not change.
 */
export function CanvasRenderer({
  sceneGraph,
  resolvedPopups,
  step,
  speed,
}: SceneRendererProps) {
  const { width, height } = useCanvas()
  const theme = useThemeSync()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) return

    const dpr = window.devicePixelRatio ?? 1
    canvas.width = width * dpr
    canvas.height = height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const colors = getLiveCanvasPanel()

    // ── Stub panel ────────────────────────────────────────────────────────────
    const panelW = 240
    const panelH = 204
    const cx = width / 2
    const cy = height / 2
    const px = cx - panelW / 2
    const py = cy - panelH / 2

    // Panel background + border
    roundRect(ctx, px, py, panelW, panelH, 16)
    ctx.fillStyle = colors.bg
    ctx.fill()
    ctx.strokeStyle = colors.border
    ctx.lineWidth = 1
    ctx.stroke()

    // Title
    ctx.font = '600 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = colors.titleText
    ctx.fillText('CANVAS RENDERER', cx, py + 26)

    // Subtitle
    ctx.font = '10px monospace'
    ctx.fillStyle = colors.subtitleText
    ctx.fillText('stub only — not yet implemented', cx, py + 42)

    // Divider
    ctx.beginPath()
    ctx.moveTo(px + 16, py + 54)
    ctx.lineTo(px + panelW - 16, py + 54)
    ctx.strokeStyle = colors.divider
    ctx.stroke()

    // Stats
    ctx.textAlign = 'left'
    ctx.font = '10px monospace'
    const stats: [string, string][] = [
      ['step', String(step)],
      ['speed', `${speed}×`],
      ['groups', String(sceneGraph.groups.size)],
      ['nodes', String(sceneGraph.nodes.size)],
      ['edges', String(sceneGraph.edges.size)],
      ['popups', String(resolvedPopups.length)],
      ['container', `${width}×${height}px`],
    ]
    stats.forEach(([label, value], i) => {
      const y = py + 70 + i * 15
      ctx.fillStyle = colors.statLabel
      ctx.fillText(label, px + 20, y)
      ctx.fillStyle = colors.statValue
      ctx.fillText(value, px + 90, y)
    })

    // Footer divider — sits 10px below the last stat (7 stats × 15px + 70 base = 175)
    ctx.beginPath()
    ctx.moveTo(px + 16, py + 178)
    ctx.lineTo(px + panelW - 16, py + 178)
    ctx.strokeStyle = colors.divider
    ctx.stroke()

    // Footer hint
    ctx.textAlign = 'center'
    ctx.fillStyle = colors.footerText
    ctx.font = '9px monospace'
    ctx.fillText('NEXT_PUBLIC_RENDERER=dom to switch back', cx, py + 194)
  }, [width, height, sceneGraph, resolvedPopups, step, speed, theme])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
