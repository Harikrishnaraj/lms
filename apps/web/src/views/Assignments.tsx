import type { View } from '../types'

const assignments = [
  { title: 'Microservices Architecture Design', course: 'Advanced Java & Spring Boot', desc: 'Design a complete microservices architecture for an e-commerce platform. Include service boundaries, communication patterns, and deployment strategy.', due: 'Aug 15, 5:00 PM', status: 'pending', type: 'Design Document', points: 100, estimated: '90 min' },
  { title: 'REST API Implementation', course: 'Backend Engineering', desc: 'Build a RESTful API for a task management system using Spring Boot. Must include authentication, CRUD operations, and proper error handling.', due: 'Aug 19, 11:59 PM', status: 'in-progress', type: 'Code Submission', points: 150, estimated: '3 hrs' },
  { title: 'Database Schema Design', course: 'System Design Fundamentals', desc: 'Design a normalized database schema for a social media platform. Include ERD diagram and justify your design decisions.', due: 'Aug 24, 5:00 PM', status: 'pending', type: 'Design Document', points: 80, estimated: '2 hrs' },
  { title: 'Spring Security Implementation', course: 'Advanced Java & Spring Boot', desc: 'Implement JWT-based authentication with Spring Security. Include refresh tokens and role-based access control.', due: 'Jul 28', status: 'submitted', type: 'Code Submission', points: 120, grade: 'A-', score: 92 },
  { title: 'Docker & CI/CD Pipeline', course: 'Cloud & DevOps', desc: 'Containerize a Spring Boot app and set up a CI/CD pipeline using GitHub Actions.', due: 'Jul 14', status: 'graded', type: 'Project', points: 200, grade: 'A', score: 96 },
]

interface Props {
  onNavigate: (view: View) => void
}

export default function Assignments({ onNavigate }: Props) {
  const statusConfig: Record<string, { label: string; class: string }> = {
    pending: { label: 'Not Started', class: 'badge-gray' },
    'in-progress': { label: 'In Progress', class: 'badge-blue' },
    submitted: { label: 'Submitted', class: 'badge-amber' },
    graded: { label: 'Graded', class: 'badge-green' },
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Assignments</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>5 assignments · 2 due this week</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Pending', 'In Progress', 'Submitted', 'Graded'].map((f) => (
            <button key={f} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: f === 'All' ? '#0F172A' : '#FFFFFF', color: f === 'All' ? 'white' : '#64748B', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {assignments.map((a, i) => {
          const cfg = statusConfig[a.status]
          const isDueSoon = ['Aug 15', 'Aug 19'].some((d) => a.due.startsWith(d))
          return (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 24px' }} className="card-hover">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{a.title}</h3>
                    <span className={`badge ${cfg.class}`}>{cfg.label}</span>
                    <span className="badge badge-gray">{a.type}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 8px' }}>{a.course}</p>
                  <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6 }}>{a.desc}</p>
                </div>
                {a.grade && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p className="font-display" style={{ fontSize: 26, fontWeight: 800, color: '#10B981', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{a.grade}</p>
                    <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>{a.score}/100</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 12, color: isDueSoon && a.status === 'pending' ? '#EF4444' : '#0F172A', fontWeight: 600, margin: '0 0 1px' }}>Due {a.due}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Deadline</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: '0 0 1px' }}>{a.points} pts</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Points</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: '0 0 1px' }}>{a.estimated}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Estimated</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {a.status === 'pending' && <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>Start Assignment</button>}
                  {a.status === 'in-progress' && <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>Continue</button>}
                  {a.status === 'submitted' && <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>View Submission</button>}
                  {a.status === 'graded' && <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>View Feedback</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
