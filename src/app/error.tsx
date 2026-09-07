'use client'
 
import { useEffect } from 'react'
import Link from 'next/link'
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App runtime error caught:', error)
  }, [error])
 
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'var(--background)',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
        Terjadi Kesalahan pada Server
      </h2>
      <p
        className="metadata-text"
        style={{ maxWidth: '500px', marginBottom: '1.5rem', lineHeight: 1.6 }}
      >
        Halaman gagal dimuat karena permintaan server mengalami batas waktu atau kendala koneksi.
        {error?.digest && (
          <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            ID Masalah (Digest): {error.digest}
          </span>
        )}
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          style={{
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
        >
          🔄 Coba Muat Ulang
        </button>
        <Link
          href="/"
          style={{
            backgroundColor: 'var(--surface-color)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
