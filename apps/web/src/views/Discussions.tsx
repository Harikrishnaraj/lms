import { useState } from 'react'

const threads = [
  { id: 1, title: 'Best practices for service-to-service auth in microservices?', author: 'Marcus T.', avatar: 'M', course: 'Advanced Java & Spring Boot', replies: 12, views: 148, time: '2 hours ago', pinned: true, tags: ['microservices', 'security'] },
  { id: 2, title: 'Confused about the difference between @Service and @Component', author: 'Priya K.', avatar: 'P', course: 'Advanced Java & Spring Boot', replies: 8, views: 92, time: '5 hours ago', pinned: false, tags: ['spring', 'annotations'] },
  { id: 3, title: 'How do I handle circuit breakers with Resilience4j?', author: 'Leo W.', avatar: 'L', course: 'Advanced Java & Spring Boot', replies: 5, views: 67, time: 'Yesterday', pinned: false, tags: ['resilience', 'patterns'] },
  { id: 4, title: 'Live session recording for Docker Networking available?', author: 'Sam C.', avatar: 'S', course: 'Cloud & DevOps', replies: 3, views: 41, time: '2 days ago', pinned: false, tags: ['docker', 'networking'] },
]

export default function Discussions() {
  const [selected, setSelected] = useState<number | null>(null)
  const [reply, setReply] = useState('')

  const thread = threads.find((t) => t.id === selected)

  if (selected && thread) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 800 }}>
        <button className="btn-secondary" style={{ marginBottom: 20, fontSize: 12 }} onClick={() => setSelected(null)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Discussions
        </button>
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {thread.tags.map((t) => <span key={t} className="badge badge-blue" style={{ fontSize: 10 }}>{t}</span>)}
          </div>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 12px', letterSpacing: '-0.01em' }}>{thread.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1D4ED8', fontSize: 13 }}>{thread.avatar}</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{thread.author}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{thread.time} · {thread.course}</p>
            </div>
          </div>
        </div>

        {/* Mock replies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            { avatar: 'J', name: 'James W. (Instructor)', text: 'Great question! For service-to-service auth in microservices, the most common approaches are: 1) JWT tokens passed via HTTP headers, 2) OAuth2 client credentials flow, and 3) mTLS for internal services. For Spring Boot, I recommend using Spring Security with JWT for most cases.', time: '1 hour ago', isInstructor: true },
            { avatar: 'A', name: 'Alex Johnson (You)', text: 'Thanks! Do you have a recommendation for when to use mTLS vs JWT?', time: '45 min ago', isInstructor: false },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: r.isInstructor ? 'linear-gradient(135deg, #0F172A, #1E3A5F)' : 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 13, flexShrink: 0 }}>{r.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</span>
                  {r.isInstructor && <span className="badge badge-blue" style={{ fontSize: 9 }}>Instructor</span>}
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{r.time}</span>
                </div>
                <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '4px 12px 12px 12px', border: '1px solid #E2E8F0', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                  {r.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: 16 }}>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Add your reply..."
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#0F172A', fontFamily: 'Inter, sans-serif', resize: 'none', minHeight: 80, background: 'transparent' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ fontSize: 12 }}>Post Reply</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Discussions</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Learn together with your peers and instructors</p>
        </div>
        <button className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Thread
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {threads.map((t) => (
          <div
            key={t.id}
            className="card-hover"
            style={{ borderRadius: 14, border: `1px solid ${t.pinned ? '#BFDBFE' : '#E2E8F0'}`, padding: '18px 22px', cursor: 'pointer', background: t.pinned ? '#F0F7FF' : '#FFFFFF' } as React.CSSProperties}
            onClick={() => setSelected(t.id)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1D4ED8', fontSize: 14, flexShrink: 0 }}>{t.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {t.pinned && (
                    <span style={{ fontSize: 10 }}>📌</span>
                  )}
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>{t.title}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{t.author}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>·</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{t.course}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>·</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>{t.time}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {t.tags.map((tag) => <span key={tag} className="badge badge-gray" style={{ fontSize: 10 }}>{tag}</span>)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{t.replies} replies</p>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{t.views} views</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
