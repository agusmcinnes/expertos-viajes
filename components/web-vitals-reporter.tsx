"use client"

import { useEffect } from 'react'
import { reportWebVitals } from '@/lib/analytics'

export function WebVitalsReporter() {
  useEffect(() => {
    reportWebVitals()
  }, [])

  return null
}
