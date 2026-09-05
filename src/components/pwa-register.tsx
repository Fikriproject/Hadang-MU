'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Force check for newest service worker
          reg.update().catch(() => {})
        })
        .catch((err) => {
          console.debug('Service Worker register notice:', err)
        })
    }
  }, [])

  return null
}

