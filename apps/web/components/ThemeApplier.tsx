'use client'

import { useEffect } from 'react'
import { useBoundStore } from '@/src/stores/store'

export function ThemeApplier() {
  const theme = useBoundStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (!theme || theme === 'default') {
      root.removeAttribute('data-theme')
    } else {
      root.dataset.theme = theme
    }
  }, [theme])

  return null
}
