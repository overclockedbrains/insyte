'use client'

import { track } from '@vercel/analytics'

type AnalyticsValue = string | number | boolean | null | undefined
type AnalyticsPayload = Record<string, AnalyticsValue>

function sanitizePayload(payload?: AnalyticsPayload) {
  if (!payload) return undefined

  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export const va = {
  track(eventName: string, payload?: AnalyticsPayload) {
    try {
      track(eventName, sanitizePayload(payload))
    } catch {
      // Analytics must never break the user flow.
    }
  },
}
