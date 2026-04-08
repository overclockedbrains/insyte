'use client'

import { HeroLoop } from '@/components/landing/HeroLoop'

interface LiveDemoLoaderProps {
  compact?: boolean
}

export function LiveDemoLoader({ compact = false }: LiveDemoLoaderProps) {
  return <HeroLoop compact={compact} />
}
