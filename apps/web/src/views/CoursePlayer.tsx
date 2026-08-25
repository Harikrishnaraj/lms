import { useState } from 'react'
import type { View } from '../types'

interface Lesson {
  title: string;
  duration: string;
  done: boolean;
  current?: boolean;
  locked?: boolean;
}

interface CourseModule {
  title: string;
  lessons: Lesson[];
}

const modules: CourseModule[] = [
  {
    title: 'Java Fundamentals Review',
    lessons: [
      { title: 'OOP Principles', duration: '12 min', done: true },
      { title: 'Generics & Collections', duration: '18 min', done: true },
    ],
  },
  {
    title: 'Spring Boot Essentials',
    lessons: [
      { title: 'Dependency Injection', duration: '15 min', done: true },
      { title: 'REST Controllers', duration: '22 min', done: true },
      { title: 'Spring Data JPA', duration: '25 min', done: false, current: true },
      { title: 'Security Basics', duration: '20 min', done: false },
    ],
  },
  {
    title: 'Microservices Architecture',
    lessons: [
      { title: 'Service Discovery', duration: '18 min', done: false, locked: true },
      { title: 'API Gateway Patterns', duration: '24 min', done: false, locked: true },
      { title: 'Event-Driven Architecture', duration: '30 min', done: false, locked: true },
    ],
  },
]

const resources = [
  { name: 'Microservices Cheat Sheet.pdf', size: '1.2 MB' },
  { name: 'Spring Boot Reference Guide', size: 'External link' },
  { name: 'Lab Exercise Files.zip', size: '3.8 MB' },
]

const notes = [
  { time: '04:32', text: 'Service discovery uses Eureka by default in Spring Cloud' },
  { time: '11:15', text: 'Remember: sidecar pattern vs. service mesh trade-offs' },
]

interface Props {
  onNavigate: (view: View) => void
}

export default function CoursePlayer({ onNavigate }: Props) {
  const [tab, setTab] = useState<'ai' | 'notes' | 'resources'>('ai')
  const [aiInput, setAiInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hi! I\'m your AI Tutor for this lesson. Ask me anything about Spring Data JPA or the concepts covered in this module.' },
  ])
  const [marked, setMarked] = useState(false)
  const [expandedModule, setExpandedModule] = useState<number | null>(1)

  const sendMessage = () => {
    if (!aiInput.trim()) return
    const userMsg = aiInput
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setAiInput('')
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Great question! Spring Data JPA provides repository interfaces that abstract database operations. The `@Repository` annotation marks it as a Spring component, and `JpaRepository<Entity, ID>` gives you built-in CRUD methods like `findAll()`, `findById()`, `save()`, and `delete()` without writing any SQL.' },
      ])
    }, 800)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#F8FAFC' }}>
      {/* Left: Curriculum */}
      <div style={{ width: 260, background: '#FFFFFF', borderRight: '1px solid #E2E8F0', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0' }}>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => onNavigate('my-learning')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back to My Learning
          </button>
          <h3 className="font-display" style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '12px 0 2px', letterSpacing: '-0.01em' }}>Advanced Java & Spring Boot</h3>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#64748B' }}>68% complete</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>5 / 9 lessons</span>
            </div>
            <div className="progress-bar-bg" style={{ height: 4 }}>
              <div className="progress-bar-fill" style={{ width: '68%', height: '100%' }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '8px' }}>
          {modules.map((mod, mi) => (
            <div key={mi}>
              <button
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '10px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 8,
                }}
                onClick={() => setExpandedModule(expandedModule === mi ? null : mi)}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', textAlign: 'left' }}>Module {mi + 1}: {mod.title}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedModule === mi ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {(expandedModule === mi || expandedModule === null) && (
                <div style={{ paddingLeft: 8 }}>
                  {mod.lessons.map((lesson, li) => (
                    <div
                      key={li}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 10px',
                        borderRadius: 6,
                        background: lesson.current ? '#EFF6FF' : 'none',
                        cursor: lesson.locked ? 'not-allowed' : 'pointer',
                        opacity: lesson.locked ? 0.5 : 1,
                        marginBottom: 2,
                      }}
                    >
                      <div style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {lesson.locked ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                        ) : lesson.done ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : lesson.current ? (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />
                        ) : (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #CBD5E1' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: lesson.current ? 600 : 400, color: lesson.current ? '#2563EB' : lesson.done ? '#64748B' : '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lesson.title}
                        </p>
                      </div>
                      <span style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0 }}>{lesson.duration}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main: Video content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Video */}
          <div style={{
            background: '#0F172A',
            borderRadius: 14,
            overflow: 'hidden',
            aspectRatio: '16/9',
            maxHeight: 400,
            marginBottom: 20,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&h=506&fit=crop&auto=format"
              alt="Course video"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#0F172A">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </button>
              <p style={{ color: 'white', fontSize: 14, fontWeight: 500, margin: 0 }}>Spring Data JPA — Repository Pattern</p>
            </div>
            {/* Video progress bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>08:24</span>
                <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 100, cursor: 'pointer' }}>
                  <div style={{ width: '35%', height: '100%', background: '#2563EB', borderRadius: 100 }} />
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>24:10</span>
              </div>
            </div>
          </div>

          {/* Lesson info */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge badge-blue">Module 2</span>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>Spring Boot Essentials</span>
            </div>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Spring Data JPA — Repository Pattern
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
              Learn how Spring Data JPA abstracts database operations through repository interfaces, reducing boilerplate code and enabling powerful query capabilities through method name conventions.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                <span style={{ fontSize: 12, color: '#64748B' }}>25 min total</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <span style={{ fontSize: 12, color: '#64748B' }}>3 resources</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{ padding: '14px 24px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Previous Lesson
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              border: `2px solid ${marked ? '#10B981' : '#E2E8F0'}`,
              background: marked ? '#ECFDF5' : '#F8FAFC',
              color: marked ? '#059669' : '#64748B',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onClick={() => setMarked(!marked)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {marked ? 'Completed!' : 'Mark as Complete'}
          </button>
          <button className="btn-primary">
            Next Lesson
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      {/* Right: AI Tutor / Notes / Resources */}
      <div style={{ width: 320, background: '#FFFFFF', borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 4px' }}>
          {[
            { id: 'ai' as const, label: 'AI Tutor', color: '#8B5CF6' },
            { id: 'notes' as const, label: 'Notes' },
            { id: 'resources' as const, label: 'Resources' },
          ].map((t) => (
            <button
              key={t.id}
              style={{
                flex: 1,
                padding: '12px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: tab === t.id ? (t.color || '#2563EB') : '#64748B',
                borderBottom: `2px solid ${tab === t.id ? (t.color || '#2563EB') : 'transparent'}`,
                transition: 'all 0.15s',
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {tab === 'ai' && (
            <>
              <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {/* Suggested prompts */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  {['Explain this concept', 'Give me an example', 'Quiz me', 'Summarize this lesson'].map((p) => (
                    <button
                      key={p}
                      style={{ fontSize: 11, background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 100, padding: '4px 10px', color: '#7C3AED', cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => { setAiInput(p) }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                    {msg.role === 'ai' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                      </div>
                    )}
                    <div style={{
                      maxWidth: '80%',
                      padding: '9px 12px',
                      borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: msg.role === 'user' ? '#2563EB' : '#F1F5F9',
                      color: msg.role === 'user' ? 'white' : '#0F172A',
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask your AI Tutor..."
                    style={{ flex: 1, padding: '8px 12px', fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8, outline: 'none', color: '#0F172A', background: '#F8FAFC' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8B5CF6' }}
                    onBlur={(e) => { e.target.style.borderColor = '#E2E8F0' }}
                  />
                  <button
                    style={{ width: 34, height: 34, borderRadius: 8, background: '#8B5CF6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={sendMessage}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'notes' && (
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {notes.map((note, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#B45309', display: 'block', marginBottom: 3 }}>@ {note.time}</span>
                    <p style={{ fontSize: 12, color: '#0F172A', margin: 0, lineHeight: 1.5 }}>{note.text}</p>
                  </div>
                ))}
              </div>
              <textarea
                placeholder="Add a note... (timestamps auto-detected)"
                style={{ width: '100%', padding: '10px 12px', fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8, minHeight: 80, resize: 'vertical', outline: 'none', color: '#0F172A', fontFamily: 'Inter, sans-serif' }}
              />
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Save Note</button>
            </div>
          )}

          {tab === 'resources' && (
            <div style={{ padding: 12 }}>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Course materials for this module</p>
              {resources.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{r.size}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
