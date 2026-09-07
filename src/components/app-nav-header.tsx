'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/theme-toggle'
import { logoutAction } from '@/app/logout-action'

interface AppNavHeaderProps {
  userName: string
  userRole?: 'ADMIN' | 'JURY' | string
  titleBadge?: string
}

export default function AppNavHeader({
  userName,
  userRole = 'ADMIN',
  titleBadge = 'ADMIN PANEL',
}: AppNavHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Prevent background scrolling while drawer is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const isAdmin = userRole === 'ADMIN'

  // Dynamic navigation items based on role
  const navItems = isAdmin
    ? [
        { href: '/admin', label: 'Dashboard Admin', icon: '📊' },
        { href: '/admin/bracket', label: 'Bagan Pertandingan', icon: '🏆' },
        { href: '/admin/matches/create', label: 'Buat Pertandingan', icon: '➕' },
        { href: '/admin/teams', label: 'Kelola Tim Hadang', icon: '👥' },
        { href: '/jury', label: 'Meja Scoring Lapangan', icon: '📱' },
        { href: '/', label: 'Beranda Publik', icon: '🏠' },
      ]
    : [
        { href: '/jury', label: 'Daftar Scoring', icon: '📋' },
        { href: '/bracket', label: 'Bagan Turnamen', icon: '🏆' },
        { href: '/', label: 'Beranda Publik', icon: '🏠' },
      ]

  return (
    <>
      {/* Universal Top Header with Hamburger for ALL screens */}
      <header className="app-nav-header safe-area-top">
        {/* Left: Hamburger Button + Brand Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
            aria-expanded={isOpen}
            className="touch-manipulation"
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              width: '38px',
              height: '38px',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {isOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>

          <Link
            href={isAdmin ? '/admin' : '/jury'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              textDecoration: 'none',
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.95rem',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)',
              }}
            >
              H
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                HADANG
              </span>
              <span
                style={{
                  backgroundColor: isAdmin ? 'rgba(37, 99, 235, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: isAdmin ? '#60a5fa' : '#4ade80',
                  border: isAdmin ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="nav-badge-text-full">{titleBadge}</span>
                <span className="nav-badge-text-short">{isAdmin ? 'ADMIN' : 'SCORING'}</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Right: User Greeting + Theme Toggle + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
          {/* Greeting shown on screens >= 640px */}
          <div
            className="hide-on-mobile"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginRight: '0.25rem',
            }}
          >
            Halo, <strong style={{ color: 'var(--text-primary)' }}>{userName}</strong>
          </div>

          <ThemeToggle />

          <form action={logoutAction} style={{ display: 'inline' }}>
            <button
              type="submit"
              className="touch-manipulation nav-logout-btn"
              title="Keluar / Logout"
              style={{
                color: 'var(--danger)',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                backgroundColor: 'var(--danger-subtle)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className="nav-logout-text">Keluar</span>
            </button>
          </form>
        </div>
      </header>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 90,
          }}
        />
      )}

      {/* Slide-out Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '290px',
          maxWidth: '85vw',
          backgroundColor: 'var(--surface-color)',
          borderRight: '1px solid var(--border-color)',
          zIndex: 100,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isOpen ? '8px 0 28px rgba(0, 0, 0, 0.45)' : 'none',
        }}
      >
        {/* Drawer Top Header */}
        <div
          style={{
            padding: '1.25rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.95rem',
              }}
            >
              H
            </span>
            <div>
              <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.15rem' }}>HADANG-MU</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.06em' }}>
                {titleBadge}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup Menu"
            style={{
              padding: '0.35rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* User Card */}
        <div
          style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--card-inner-bg)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Login sebagai</div>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {userName}
            </div>
          </div>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: isAdmin ? 'var(--primary-subtle)' : 'var(--success-subtle)',
              color: isAdmin ? 'var(--primary)' : 'var(--success)',
              border: isAdmin ? '1px solid var(--primary)' : '1px solid var(--success)',
            }}
          >
            {userRole}
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="touch-manipulation"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                  backgroundColor: isActive ? 'var(--primary-subtle)' : 'transparent',
                  border: isActive ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Drawer Footer */}
        <div
          className="safe-area-bottom"
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            backgroundColor: 'var(--surface-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tema Gelap / Terang
            </span>
            <ThemeToggle />
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="touch-manipulation"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(220, 38, 38, 0.35)',
                backgroundColor: 'var(--danger-subtle)',
                color: 'var(--danger)',
                fontWeight: 800,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <span>🚪</span>
              <span>Keluar (Logout)</span>
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
