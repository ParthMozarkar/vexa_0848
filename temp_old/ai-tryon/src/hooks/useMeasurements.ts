'use client'
import { useState, useEffect } from 'react'
import type { Measurements } from '@/types'

export function useMeasurements(userId: string | undefined) {
  const [measurements, setMeasurements] = useState<Measurements | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setMeasurements(null)
      return
    }

    const fetchMeasurements = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/user/measurements')
        if (res.ok) {
          const data = await res.json()
          setMeasurements(data)
        }
      } catch (err) {
        console.error('Error fetching measurements:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeasurements()
  }, [userId])

  return {
    measurements,
    isLoading,
    hasCompletedOnboarding: !!measurements && !!measurements.height,
  }
}
