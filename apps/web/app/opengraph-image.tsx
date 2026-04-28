import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'insyte — Interactive Visualizer for Algorithms, DSA & System Design'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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
            fontSize: '28px',
            fontWeight: 700,
            color: '#a0a0b8',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '32px',
          }}
        >
          insyte
        </div>

        <div
          style={{
            fontSize: '68px',
            fontWeight: 800,
            color: '#f0f0f8',
            lineHeight: 1.1,
            maxWidth: '900px',
          }}
        >
          Understand any tech concept.
        </div>

        <div
          style={{
            fontSize: '68px',
            fontWeight: 800,
            background: 'linear-gradient(to right, #7c6af7, #38bdf8)',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1.1,
            marginTop: '8px',
          }}
        >
          By playing with it.
        </div>

        <div
          style={{
            fontSize: '26px',
            color: '#6b6b80',
            marginTop: '40px',
          }}
        >
          Interactive simulations for DSA, System Design &amp; CS Concepts
        </div>
      </div>
    ),
    { ...size },
  )
}
