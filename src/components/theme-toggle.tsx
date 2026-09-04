'use client'

import { useState, useEffect } from 'react'

interface ThemeToggleProps {
  style?: React.CSSProperties
  className?: string
}

export default function ThemeToggle({ style, className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('hadang_theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initial = prefersDark ? 'dark' : 'light'
      setTheme(initial)
      document.documentElement.setAttribute('data-theme', initial)
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('hadang_theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  if (!mounted) {
    // Placeholder to avoid layout shift
    return (
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          ...style,
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      title={theme === 'dark' ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Gelap (Dark Mode)'}
      aria-label="Toggle Theme"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '8px',
        backgroundColor: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-primary)',
        fontSize: '1.1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        ...style,
      }}
    >
      {theme === 'dark' ? (
        <span role="img" aria-label="light mode">
          ☀️
        </span>
      ) : (
        <span role="img" aria-label="dark mode">
          🌙
        </span>
      )}
    </button>
  )
}
