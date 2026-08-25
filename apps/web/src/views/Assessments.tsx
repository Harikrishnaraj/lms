import type { View } from '../types'

const assessments = [
  { name: 'Microservices Architecture Quiz', course: 'Advanced Java & Spring Boot', type: 'Quiz', questions: 20, duration: '30 min', passing: '75%', due: 'Aug 16, 11:59 PM', attempts: '2 remaining', status: 'available' },
  { name: 'REST API Design Assessment', course: 'Backend Engineering', type: 'Assessment', questions: 35, duration: '45 min', passing: '80%', due: 'Aug 19, 10:00 AM', attempts: '3 remaining', status: 'available' },
  { name: 'System Design Midterm', course: 'System Design Fundamentals', type: 'Exam', questions: 50, duration: '90 min', passing: '70%', due: 'Aug 24, 5:00 PM', attempts: '1 remaining', status: 'upcoming' },
  { name: 'Java Fundamentals Final', course: 'Advanced Java & Spring Boot', type: 'Exam', questions: 40, duration: '60 min', passing: '75%', due: 'Jul 10', attempts: 'Completed', status: 'completed', score: 94 },
  { name: 'Spring Boot Practical', course: 'Advanced Java & Spring Boot', type: 'Assessment', questions: 25, duration: '40 min', passing: '75%', due: 'Jun 22', attempts: 'Completed', status: 'completed', score: 88 },
]

interface Props {
  onNavigate: (view: View) => void
}

export default function Assessments({ onNavigate }: Props) {
  const tabs = ['All', 'Available', 'Upcoming', 'Completed']
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Assessments</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Quizzes, assessments, and exams to test your knowledge</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total', value: '5', color: '#2563EB' },
          { label: 'Available', value: '2', color: '#10B981' },
          { label: 'Upcoming', value: '1', color: '#F59E0B' },
          { label: 'Avg Score', value: '85%', color: '#8B5CF6' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 16px' }}>
            <p className="font-display" style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button
            key={t}
            style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: t === 'All' ? '#0F172A' : '#FFFFFF', color: t === 'All' ? 'white' : '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {assessments.map((a, i) => (
          <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 24px' }} className="card-hover">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{a.name}</h3>
                  <span className={`badge ${a.type === 'Exam' ? 'badge-red' : a.type === 'Quiz' ? 'badge-amber' : 'badge-blue'}`}>{a.type}</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{a.course}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {a.status === 'completed' && a.score ? (
                  <>
                    <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#10B981', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{a.score}%</p>
                    <span className="badge badge-green">Passed</span>
                  </>
                ) : (
                  <>
                    <span className={`badge ${a.status === 'available' ? 'badge-green' : a.status === 'upcoming' ? 'badge-amber' : 'badge-gray'}`}>
                      {a.status === 'available' ? 'Available Now' : a.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: a.status !== 'completed' ? 14 : 0 }}>
              {[
                { label: 'Questions', value: a.questions },
                { label: 'Duration', value: a.duration },
                { label: 'Pass score', value: a.passing },
                { label: 'Due', value: a.due },
                { label: 'Attempts', value: a.attempts },
              ].map((s) => (
                <div key={s.label}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 1px' }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {a.status !== 'completed' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn-primary ${a.status === 'upcoming' ? '' : ''}`}
                  style={{ background: a.status === 'upcoming' ? '#94A3B8' : '#2563EB', cursor: a.status === 'upcoming' ? 'not-allowed' : 'pointer' }}
                  onClick={() => a.status === 'available' && onNavigate('quiz')}
                  disabled={a.status === 'upcoming'}
                >
                  {a.status === 'available' ? 'Start Assessment' : 'Not Yet Available'}
                </button>
                {a.status === 'available' && (
                  <button className="btn-secondary" style={{ fontSize: 13 }}>
                    View Instructions
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
