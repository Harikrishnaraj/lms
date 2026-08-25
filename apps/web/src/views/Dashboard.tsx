import type { View } from '../types'

const milestones = [
  { label: 'Java Fundamentals', status: 'completed' },
  { label: 'Spring Boot', status: 'completed' },
  { label: 'REST APIs', status: 'completed' },
  { label: 'Microservices', status: 'current' },
  { label: 'Cloud & DevOps', status: 'upcoming' },
  { label: 'Capstone Project', status: 'locked' },
]

const todayTasks = [
  { title: 'Complete Spring Boot Quiz', course: 'Advanced Java & Spring Boot', due: 'Today, 11:59 PM', time: '25 min', type: 'quiz', status: 'pending' },
  { title: 'Watch Microservices lesson', course: 'Microservices Architecture', due: 'Today', time: '18 min', type: 'lesson', status: 'in-progress' },
  { title: 'Submit Architecture Assignment', course: 'System Design Fundamentals', due: 'Tomorrow, 5:00 PM', time: '90 min', type: 'assignment', status: 'pending' },
]

const assessments = [
  { name: 'Microservices Architecture Quiz', course: 'Advanced Java & Spring Boot', questions: 20, duration: '30 min', passing: '75%', due: 'Aug 16', attempts: 2, },
  { name: 'REST API Design Assessment', course: 'Backend Engineering', questions: 35, duration: '45 min', passing: '80%', due: 'Aug 19', attempts: 3, },
]

const recommendations = [
  { title: 'Kubernetes & Container Orchestration', instructor: 'Dr. Sarah Chen', rating: 4.9, duration: '12h 30m', difficulty: 'Intermediate', skills: ['Kubernetes', 'Docker', 'DevOps'], img: 'photo-1667372393119-3d4c48d07fc9' },
  { title: 'System Design: The Complete Guide', instructor: 'Marcus Rivera', rating: 4.8, duration: '18h 15m', difficulty: 'Advanced', skills: ['Architecture', 'Scalability'], img: 'photo-1555066931-4365d14bab8c' },
  { title: 'AWS Cloud Practitioner', instructor: 'Elena Volkov', rating: 4.7, duration: '8h 45m', difficulty: 'Beginner', skills: ['AWS', 'Cloud', 'Infrastructure'], img: 'photo-1451187580459-43490279c0fa' },
]

interface Props {
  onNavigate: (view: View) => void
}

export default function Dashboard({ onNavigate }: Props) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Good morning, Alex 👋
        </h1>
        <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
          Continue building your skills. You're making great progress this week.
        </p>
      </div>

      {/* Stat cards + Hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 24 }}>
        {/* Hero: Continue Learning */}
        <div
          className="card-hover"
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            padding: 24,
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('course-player')}
        >
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 120,
                height: 80,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
                flexShrink: 0,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=240&h=160&fit=crop&auto=format"
                alt="Java programming"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0F172A">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="badge badge-blue">In Progress</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>Last accessed 2h ago</span>
              </div>
              <h2 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                Advanced Java & Spring Boot
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px' }}>
                Module 4 · Microservices Architecture
              </p>

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>68% complete</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>42 min remaining</span>
                </div>
                <div className="progress-bar-bg" style={{ height: 6 }}>
                  <div className="progress-bar-fill" style={{ width: '68%', height: '100%' }} />
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
              Lesson 3 of 8 · Service Discovery & Load Balancing
            </p>
            <button className="btn-primary" onClick={(e) => { e.stopPropagation(); onNavigate('course-player') }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Resume Learning
            </button>
          </div>
        </div>

        {/* Stat cards column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Overall Progress', value: '68%', sub: 'Across all courses', color: '#2563EB', icon: '📈' },
            { label: 'Learning Streak', value: '12 days', sub: 'Keep it up!', color: '#10B981', icon: '🔥' },
            { label: 'Hours Learned', value: '24.5 hrs', sub: 'This month', color: '#8B5CF6', icon: '⏱' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 20 }}>{stat.icon}</div>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: stat.color, margin: '0 0 1px', fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24 }}>
        {/* Today's learning */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Today's Learning</h3>
            <span className="badge badge-blue">3 tasks</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayTasks.map((task, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: task.status === 'in-progress' ? '#EFF6FF' : '#F8FAFC',
                  border: `1px solid ${task.status === 'in-progress' ? '#BFDBFE' : '#E2E8F0'}`,
                }}
              >
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: task.type === 'quiz' ? '#FEF3C7' : task.type === 'lesson' ? '#DBEAFE' : '#F3E8FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {task.type === 'quiz' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>}
                  {task.type === 'lesson' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5,3 19,12 5,21" /></svg>}
                  {task.type === 'assignment' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</p>
                  <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>{task.course} · {task.time}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: task.due.includes('Today') ? '#EF4444' : '#64748B', margin: '0 0 4px', fontWeight: task.due.includes('Today') ? 600 : 400 }}>{task.due}</p>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => task.type === 'quiz' ? onNavigate('quiz') : onNavigate('course-player')}
                  >
                    {task.status === 'in-progress' ? 'Continue' : 'Start'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Path */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Your Learning Path</h3>
            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onNavigate('learning-path')}>View all</button>
          </div>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px' }}>Java Backend Engineer · 58% complete</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: `2px solid ${m.status === 'completed' ? '#10B981' : m.status === 'current' ? '#2563EB' : m.status === 'upcoming' ? '#CBD5E1' : '#E2E8F0'}`,
                    background: m.status === 'completed' ? '#10B981' : m.status === 'current' ? '#EFF6FF' : '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {m.status === 'completed' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    {m.status === 'current' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />}
                    {m.status === 'upcoming' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1' }} />}
                    {m.status === 'locked' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>}
                  </div>
                  {i < milestones.length - 1 && (
                    <div style={{ width: 2, height: 20, background: m.status === 'completed' ? '#10B981' : '#E2E8F0', margin: '2px 0' }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < milestones.length - 1 ? 4 : 0, paddingTop: 4 }}>
                  <p style={{
                    fontSize: 13,
                    fontWeight: m.status === 'current' ? 600 : 500,
                    color: m.status === 'completed' ? '#10B981' : m.status === 'current' ? '#2563EB' : m.status === 'locked' ? '#94A3B8' : '#475569',
                    margin: 0,
                  }}>
                    {m.label}
                  </p>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
                    {m.status === 'completed' ? 'Completed' : m.status === 'current' ? 'In progress' : m.status === 'locked' ? 'Locked' : 'Upcoming'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Assessments */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Upcoming Assessments</h3>
          <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onNavigate('assessments')}>View all</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {assessments.map((a, i) => (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: 20 }} className="card-hover">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '0 0 3px' }}>{a.name}</h4>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{a.course}</p>
                </div>
                <span className="badge badge-amber">Due {a.due}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                {[
                  { label: 'Questions', value: a.questions },
                  { label: 'Duration', value: a.duration },
                  { label: 'Pass score', value: a.passing },
                  { label: 'Attempts', value: a.attempts },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 1px' }}>{stat.value}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNavigate('quiz')}>
                Start Assessment
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Recommended for You</h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Based on your current learning path and skills</p>
          </div>
          <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Browse all</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {recommendations.map((c, i) => (
            <div key={i} className="card-hover" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', cursor: 'pointer' }} onClick={() => onNavigate('course-player')}>
              <div style={{ height: 140, background: '#E2E8F0', position: 'relative' }}>
                <img
                  src={`https://images.unsplash.com/${c.img}?w=400&h=280&fit=crop&auto=format`}
                  alt={c.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span className="badge" style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  background: c.difficulty === 'Beginner' ? '#D1FAE5' : c.difficulty === 'Intermediate' ? '#DBEAFE' : '#EDE9FE',
                  color: c.difficulty === 'Beginner' ? '#059669' : c.difficulty === 'Intermediate' ? '#1D4ED8' : '#7C3AED',
                }}>
                  {c.difficulty}
                </span>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 4px', lineHeight: 1.4 }}>{c.title}</h4>
                <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 8px' }}>{c.instructor}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{c.rating}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>·</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{c.duration}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.skills.slice(0, 2).map((s) => (
                    <span key={s} className="badge badge-gray" style={{ fontSize: 10 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Tutor floating hint */}
      <div
        style={{
          marginTop: 24,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
          borderRadius: 14,
          border: '1px solid #DDD6FE',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          cursor: 'pointer',
        }}
        className="card-hover"
        onClick={() => onNavigate('ai-tutor')}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#4C1D95', margin: '0 0 2px' }}>Ask your AI Tutor</p>
          <p style={{ fontSize: 12, color: '#6D28D9', margin: 0 }}>Stuck on microservices? Get instant explanations, examples, and practice questions.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Explain this', 'Quiz me', 'Give examples'].map((prompt) => (
            <span key={prompt} style={{ fontSize: 11, background: 'white', border: '1px solid #DDD6FE', borderRadius: 100, padding: '3px 10px', color: '#7C3AED', cursor: 'pointer', fontWeight: 500 }}>
              {prompt}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
