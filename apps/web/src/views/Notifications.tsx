import React, { useState } from 'react'

const allNotifications = [
  { id: 1, type: 'quiz', title: 'Quiz Available', desc: 'Spring Boot Quiz is now available. Complete before Aug 14, 11:59 PM.', time: '2 hours ago', unread: true, color: '#F59E0B', bg: '#FFFBEB' },
  { id: 2, type: 'assignment', title: 'Assignment Due Soon', desc: 'Architecture Assignment is due in 28 hours. Submit before Tomorrow, 5:00 PM.', time: '4 hours ago', unread: true, color: '#EF4444', bg: '#FEF2F2' },
  { id: 3, type: 'announcement', title: 'Instructor Announcement', desc: 'New live session on Docker Networking added for Aug 18 at 4 PM. Don\'t miss it!', time: '6 hours ago', unread: true, color: '#2563EB', bg: '#EFF6FF' },
  { id: 4, type: 'reminder', title: 'Learning Reminder', desc: 'You haven\'t studied today. Keep your 12-day streak alive!', time: 'Yesterday', unread: false, color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 5, type: 'update', title: 'Course Updated', desc: 'Advanced Java & Spring Boot has been updated with 2 new lessons on Resilience4j.', time: '2 days ago', unread: false, color: '#10B981', bg: '#ECFDF5' },
  { id: 6, type: 'certificate', title: 'Certificate Earned 🎉', desc: 'Congratulations! You\'ve earned the React & TypeScript Mastery certificate.', time: 'Jun 14', unread: false, color: '#10B981', bg: '#ECFDF5' },
]

const typeIcon: Record<string, React.ReactNode> = {
  quiz: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
  assignment: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  announcement: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  reminder: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>,
  update: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
  certificate: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>,
}

export default function Notifications() {
  const [notifications, setNotifications] = useState(allNotifications)
  const unreadCount = notifications.filter((n) => n.unread).length

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  return (
    <div style={{ padding: '28px 32px', maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Notifications</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              display: 'flex',
              gap: 14,
              padding: '16px 18px',
              background: n.unread ? n.bg : '#FFFFFF',
              border: `1px solid ${n.unread ? n.color + '33' : '#E2E8F0'}`,
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
              position: 'relative',
            }}
            onClick={() => setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, unread: false } : item))}
          >
            {n.unread && (
              <div style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: n.color }} />
            )}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: n.bg,
              border: `1px solid ${n.color}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: n.color,
            }}>
              {typeIcon[n.type]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{n.title}</p>
                <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{n.time}</span>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>{n.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {notifications.every((n) => !n.unread) && (
        <div style={{ textAlign: 'center', marginTop: 32, padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>All caught up!</p>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>You have no unread notifications.</p>
        </div>
      )}
    </div>
  )
}
