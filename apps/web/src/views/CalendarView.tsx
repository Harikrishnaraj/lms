import { useState } from 'react'

const events = [
  { day: 14, title: 'Spring Boot Quiz', type: 'quiz', time: '11:59 PM', color: '#F59E0B', bg: '#FFFBEB' },
  { day: 15, title: 'Architecture Assignment Due', type: 'assignment', time: '5:00 PM', color: '#EF4444', bg: '#FEF2F2' },
  { day: 16, title: 'Microservices Assessment', type: 'assessment', time: '2:00 PM', color: '#2563EB', bg: '#EFF6FF' },
  { day: 18, title: 'Live Session: Docker Basics', type: 'live', time: '4:00 PM', color: '#10B981', bg: '#ECFDF5' },
  { day: 19, title: 'REST API Design Exam', type: 'assessment', time: '10:00 AM', color: '#2563EB', bg: '#EFF6FF' },
  { day: 22, title: 'Study Session: Cloud Fundamentals', type: 'study', time: '9:00 AM', color: '#8B5CF6', bg: '#F5F3FF' },
  { day: 24, title: 'System Design Assignment', type: 'assignment', time: '11:59 PM', color: '#EF4444', bg: '#FEF2F2' },
  { day: 26, title: 'Kubernetes Workshop (Live)', type: 'live', time: '3:00 PM', color: '#10B981', bg: '#ECFDF5' },
  { day: 30, title: 'Monthly Progress Review', type: 'study', time: '6:00 PM', color: '#8B5CF6', bg: '#F5F3FF' },
]

const daysInMonth = 31
const startDay = 4 // Friday

export default function CalendarView() {
  const [today] = useState(14)

  const eventTypeLabel: Record<string, string> = {
    quiz: 'Quiz',
    assignment: 'Assignment Due',
    assessment: 'Assessment',
    live: 'Live Session',
    study: 'Study',
  }

  const cells: (number | null)[] = Array(startDay).fill(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)
  while (cells.length % 7 !== 0) cells.push(null)

  const upcomingEvents = events.filter((e) => e.day >= today).slice(0, 5)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Calendar</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>August 2026 · 9 events this month</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>‹ July</button>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>August</button>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>September ›</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Quiz', color: '#F59E0B' },
          { label: 'Assignment', color: '#EF4444' },
          { label: 'Assessment', color: '#2563EB' },
          { label: 'Live Session', color: '#10B981' },
          { label: 'Study', color: '#8B5CF6' },
        ].map((t) => (
          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color }} />
            <span style={{ fontSize: 12, color: '#64748B' }}>{t.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Calendar grid */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E2E8F0' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em' }}>
                {d}
              </div>
            ))}
          </div>
          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              const dayEvents = day ? events.filter((e) => e.day === day) : []
              const isToday = day === today
              return (
                <div
                  key={i}
                  style={{
                    borderRight: (i + 1) % 7 !== 0 ? '1px solid #F1F5F9' : 'none',
                    borderBottom: '1px solid #F1F5F9',
                    padding: '8px',
                    minHeight: 80,
                    background: day ? 'transparent' : '#FAFAFA',
                  }}
                >
                  {day && (
                    <>
                      <div style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: isToday ? '#2563EB' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 4,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'white' : '#0F172A' }}>{day}</span>
                      </div>
                      {dayEvents.slice(0, 2).map((ev, ei) => (
                        <div
                          key={ei}
                          style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: ev.bg,
                            borderLeft: `2px solid ${ev.color}`,
                            marginBottom: 3,
                            cursor: 'pointer',
                          }}
                        >
                          <p style={{ fontSize: 10, color: ev.color, margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.title}
                          </p>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span style={{ fontSize: 10, color: '#64748B' }}>+{dayEvents.length - 2} more</span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming events */}
        <div>
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px' }}>
            <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Upcoming Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingEvents.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px', borderRadius: 10, background: ev.bg, border: `1px solid ${ev.color}22` }}>
                  <div style={{ width: 4, borderRadius: 100, background: ev.color, flexShrink: 0, alignSelf: 'stretch', minHeight: 40 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{ev.title}</p>
                    <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 2px' }}>{eventTypeLabel[ev.type]}</p>
                    <p style={{ fontSize: 11, color: ev.color, fontWeight: 600, margin: 0 }}>Aug {ev.day} · {ev.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
