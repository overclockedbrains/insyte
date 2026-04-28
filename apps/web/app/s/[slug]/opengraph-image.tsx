import { ImageResponse } from 'next/og'
import { getTopicBySlug } from '@/src/content/topic-index'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const topic = getTopicBySlug(slug)

  const title = topic?.title ?? slug.replace(/-/g, ' ')
  const category = topic?.category ?? 'Interactive Simulation'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background: '#0e0e13',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(to right, #7c6af7, #38bdf8)',
          }}
        />

        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#7c6af7',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '28px',
          }}
        >
          {category}
        </div>

        <div
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: '#f0f0f8',
            lineHeight: 1.1,
            maxWidth: '950px',
          }}
        >
          {title}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#6b6b80',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            insyte
          </div>
          <div style={{ color: '#3a3a4a', fontSize: '22px' }}>·</div>
          <div style={{ fontSize: '22px', color: '#6b6b80' }}>
            Interactive Simulation
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
