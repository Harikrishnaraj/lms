import { useState } from 'react'
import type { View } from '../types'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  onNavigate: (view: View) => void
  title: string
}

export default function Header({ onNavigate, title }: HeaderProps) {
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()

  return (
    <header
      style={{
        height: 60,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <h1
        className="font-display"
        style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em', flex: '0 0 auto' }}
      >
        {title}
      </h1>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, marginLeft: 16, position: 'relative' }}>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses, lessons, topics..."
          style={{
            width: '100%',
            padding: '8px 12px 8px 38px',
            fontSize: 13,
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            background: '#F8FAFC',
            color: '#0F172A',
            outline: 'none',
            transition: 'border 0.15s',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#fff' }}
          onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        {/* Notifications */}
        <button
          onClick={() => onNavigate('notifications')}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              background: '#EF4444',
              borderRadius: '50%',
              border: '1.5px solid white',
            }}
          />
        </button>

        {/* Messages */}
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>

        {/* Help */}
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              marginLeft: 4,
            }}
          >
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 40,
                right: 0,
                background: '#FFFFFF',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '12px 16px',
                minWidth: 160,
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{user?.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748B', wordBreak: 'break-all' }}>{user?.email}</p>
              </div>
              <div style={{ borderTop: '1px solid #F1F5F9', margin: '4px 0' }} />
              <button
                onClick={() => {
                  logout()
                  setMenuOpen(false)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '4px 0',
                  width: '100%',
                }}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
