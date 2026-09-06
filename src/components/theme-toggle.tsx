'use client'

import { useState, useEffect } from 'react'

interface ThemeToggleProps {
  style?: React.CSSProperties
  className?: string
}

export default function ThemeToggle({ style, className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('hadang_theme') as 'dark' | 'light' | null
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const initial = prefersDark ? 'dark' : 'light'
        setTheme(initial)
        document.documentElement.setAttribute('data-theme', initial)
      }
    } catch (e) {}
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try {
      localStorage.setItem('hadang_theme', nextTheme)
      document.documentElement.setAttribute('data-theme', nextTheme)
    } catch (e) {}
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      suppressHydrationWarning
      title="Beralih Tema Gelap/Terang"
      aria-label="Beralih Tema Tampilan"
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
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
        }}
        suppressHydrationWarning
      >
        <svg
          className="theme-icon-sun"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <svg
          className="theme-icon-moon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#60A5FA"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </span>
    </button>
  )
}
