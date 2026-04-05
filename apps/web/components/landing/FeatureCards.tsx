'use client'

import { motion } from 'framer-motion'

// ─── FeatureCards — 3 feature highlight cards ─────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        <path d="M19 3v4" />
        <path d="M21 5h-4" />
      </svg>
    ),
    title: 'Interactive',
    description:
      'Play with input values, speed up playback, and step through every state change at your own pace.',
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    ),
    title: 'AI-Powered',
    description:
      'Type any concept or paste code — insyte generates a fully animated simulation using your own AI key.',
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
    title: 'Shareable',
    description:
      'Every simulation lives at a permanent URL. Share a link and anyone can jump in and play.',
  },
]

export function FeatureCards() {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map((feat) => (
          <motion.div
            key={feat.title}
            className="group rounded-3xl p-6 border border-outline-variant/20 bg-surface-container-low hover:border-primary/30 transition-colors duration-200"
            whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(183,159,255,0.12)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Icon */}
            <div className="h-12 w-12 rounded-2xl bg-surface-container-high border border-outline-variant/20 flex items-center justify-center mb-4 text-primary group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors duration-200">
              {feat.icon}
            </div>

            {/* Content */}
            <h3 className="text-base font-bold font-headline text-on-surface mb-2">
              {feat.title}
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {feat.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
