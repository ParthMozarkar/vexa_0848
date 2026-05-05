'use client'
import { useEffect } from 'react'
import { useAvatarStore } from '@/store/avatarStore'

export function useAvatar(userId: string | undefined) {
  const { avatar, status, glbUrl, setAvatar, setStatus } = useAvatarStore()

  useEffect(() => {
    if (!userId || status === 'ready') return
    let cancelled = false
    let attempts = 0

    const poll = async () => {
      while (!cancelled && attempts < 60) {
        await new Promise(r => setTimeout(r, 3000))
        attempts++
        try {
          const res = await fetch(`/api/avatar/${userId}`)
          if (!res.ok) continue
          const data = await res.json()
          if (data.status === 'ready') {
            setAvatar(data)
            return
          }
          if (data.status === 'error') {
            setStatus('error')
            return
          }
        } catch (err) {
          console.error('Avatar polling error:', err)
        }
      }
    }

    if (status === 'queued' || status === 'processing') poll()
    return () => { cancelled = true }
  }, [userId, status, setAvatar, setStatus])

  return { avatar, status, glbUrl, isLoading: status === 'processing' || status === 'queued' }
}
