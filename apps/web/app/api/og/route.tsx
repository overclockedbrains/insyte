import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

// Edge runtime — required for next/og (Satori)
export const runtime = 'edge'

// ─── Color tokens (from DESIGN.md) ───────────────────────────────────────────

const COLORS = {
  bg: '#0e0e13',
  surface: '#19191f',
  surfaceHigh: '#1f1f26',
  primary: '#b79fff',
  secondary: '#3adffa',
  tertiary: '#919bff',
  onSurface: '#f9f5fd',
  onSurfaceVariant: '#acaab1',
  outline: '#48474d',
}

// ─── Type badge config ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  concept: { label: 'Concept', color: COLORS.primary, bg: 'rgba(183,159,255,0.15)' },
  'dsa-trace': { label: 'DSA', color: COLORS.secondary, bg: 'rgba(58,223,250,0.15)' },
  lld: { label: 'LLD', color: COLORS.onSurfaceVariant, bg: 'rgba(172,170,177,0.1)' },
  hld: { label: 'HLD', color: COLORS.tertiary, bg: 'rgba(145,155,255,0.15)' },
}

// ─── GET /api/og?slug=[slug] ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') ?? 'simulation'
  const title = searchParams.get('title') ?? formatSlugAsTitle(slug)
  const type = searchParams.get('type') ?? 'concept'
  const category = searchParams.get('category') ?? ''

  const typeConfig = TYPE_CONFIG[type] ?? TYPE_CONFIG['concept']!

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          backgroundColor: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Dot grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle, rgba(183,159,255,0.12) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Purple ambient glow — top-left */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            left: -80,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'rgba(183,159,255,0.08)',
            filter: 'blur(80px)',
          }}
        />

        {/* Cyan ambient glow — bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            right: -60,
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'rgba(58,223,250,0.08)',
            filter: 'blur(80px)',
          }}
        />

        {/* Content container */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 72px',
            height: '100%',
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 'auto',
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.primary,
                letterSpacing: '-0.5px',
              }}
            >
              i
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.onSurface,
                letterSpacing: '-0.5px',
              }}
            >
              nsyte
            </span>
          </div>

          {/* Main content — centered vertically */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {/* Badges row */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* Type badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: 999,
                  backgroundColor: typeConfig.bg,
                  border: `1px solid ${typeConfig.color}30`,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: typeConfig.color,
                  }}
                >
                  {typeConfig.label}
                </span>
              </div>

              {/* Category badge */}
              {category && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 14px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${COLORS.outline}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: COLORS.onSurfaceVariant,
                    }}
                  >
                    {category}
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: title.length > 40 ? 52 : 64,
                fontWeight: 800,
                color: COLORS.onSurface,
                lineHeight: 1.1,
                letterSpacing: '-1.5px',
                maxWidth: 900,
              }}
            >
              {title}
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: 22,
                color: COLORS.onSurfaceVariant,
                fontWeight: 400,
                marginTop: 4,
              }}
            >
              Interactive simulation · insyte.dev
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 32,
              borderTop: `1px solid ${COLORS.outline}40`,
            }}
          >
            <span style={{ fontSize: 15, color: COLORS.onSurfaceVariant }}>
              See how it works.
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 999,
                backgroundColor: 'rgba(183,159,255,0.12)',
                border: '1px solid rgba(183,159,255,0.2)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.primary }}>
                Play now →
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatSlugAsTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
