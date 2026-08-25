import type { View } from '../types'

const milestones = [
  { title: 'Java Fundamentals', desc: '8 lessons · 4.5 hrs', skills: ['OOP', 'Generics', 'Collections'], status: 'completed', score: 94 },
  { title: 'Spring Boot Core', desc: '10 lessons · 6 hrs', skills: ['DI', 'REST', 'JPA'], status: 'completed', score: 88 },
  { title: 'REST API Design', desc: '7 lessons · 3.5 hrs', skills: ['REST', 'OpenAPI', 'Security'], status: 'completed', score: 91 },
  { title: 'Microservices Architecture', desc: '9 lessons · 5 hrs', skills: ['Docker', 'Service Mesh', 'Eureka'], status: 'current', progress: 45 },
  { title: 'Cloud & DevOps', desc: '12 lessons · 8 hrs', skills: ['AWS', 'CI/CD', 'Terraform'], status: 'upcoming' },
  { title: 'Capstone Project', desc: '3 lessons · 12+ hrs', skills: ['Full Stack', 'Architecture', 'Deployment'], status: 'locked' },
]

interface Props {
  onNavigate: (view: View) => void
}

export default function LearningPath({ onNavigate }: Props) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Learning Paths</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Structured programs designed to take you from beginner to job-ready</p>
      </div>

      {/* Active path hero */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: 20, padding: 28, marginBottom: 28, color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(37,99,235,0.2)' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(139,92,246,0.15)' }} />
        <div style={{ position: 'relative' }}>
          <span className="badge" style={{ background: 'rgba(37,99,235,0.3)', color: '#93C5FD', marginBottom: 12, display: 'inline-flex' }}>Active Path</span>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Java Backend Engineer</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 20px' }}>
            Master Java, Spring Boot, Microservices, and Cloud to become a senior backend engineer.
          </p>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            {[
              { label: 'Overall progress', value: '58%' },
              { label: 'Milestones', value: '3 / 6' },
              { label: 'Est. completion', value: 'Oct 2025' },
              { label: 'Skills earned', value: '12 / 20' },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
            <div style={{ width: '58%', height: '100%', background: 'linear-gradient(90deg, #2563EB, #8B5CF6)', borderRadius: 100 }} />
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', padding: 28, marginBottom: 24 }}>
        <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 24px' }}>Path Roadmap</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 4 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: `2.5px solid ${m.status === 'completed' ? '#10B981' : m.status === 'current' ? '#2563EB' : m.status === 'upcoming' ? '#CBD5E1' : '#E2E8F0'}`,
                  background: m.status === 'completed' ? '#10B981' : m.status === 'current' ? '#EFF6FF' : '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  {m.status === 'completed' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  {m.status === 'current' && (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#2563EB' }} />
                  )}
                  {m.status === 'upcoming' && <span style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8' }}>{i + 1}</span>}
                  {m.status === 'locked' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>}
                  {m.status === 'current' && (
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #BFDBFE', animation: 'none' }} />
                  )}
                </div>
                {i < milestones.length - 1 && (
                  <div style={{ width: 2, height: 48, background: m.status === 'completed' ? '#10B981' : '#E2E8F0', margin: '4px 0' }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: i < milestones.length - 1 ? 16 : 0 }}>
                <div style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: `1px solid ${m.status === 'current' ? '#BFDBFE' : '#E2E8F0'}`,
                  background: m.status === 'current' ? '#F0F7FF' : m.status === 'locked' ? '#F8FAFC' : '#FFFFFF',
                  opacity: m.status === 'locked' ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: m.status === 'locked' ? '#94A3B8' : '#0F172A', margin: 0 }}>{m.title}</h4>
                        {m.status === 'completed' && <span className="badge badge-green">Completed</span>}
                        {m.status === 'current' && <span className="badge badge-blue">In Progress</span>}
                        {m.status === 'upcoming' && <span className="badge badge-gray">Upcoming</span>}
                        {m.status === 'locked' && <span className="badge badge-gray">Locked</span>}
                      </div>
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{m.desc}</p>
                    </div>
                    {m.status === 'completed' && m.score && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#10B981', margin: 0 }}>{m.score}%</p>
                        <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Avg score</p>
                      </div>
                    )}
                    {m.status === 'current' && m.progress !== undefined && (
                      <div style={{ textAlign: 'right', minWidth: 80 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#2563EB', margin: '0 0 4px' }}>{m.progress}%</p>
                        <div className="progress-bar-bg" style={{ height: 4, width: 80 }}>
                          <div className="progress-bar-fill" style={{ width: `${m.progress}%`, height: '100%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.skills.map((s) => (
                      <span key={s} className="badge badge-gray" style={{ fontSize: 11 }}>{s}</span>
                    ))}
                  </div>
                  {m.status === 'current' && (
                    <button className="btn-primary" style={{ marginTop: 12, fontSize: 12, padding: '6px 14px' }} onClick={() => onNavigate('course-player')}>
                      Continue Learning →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other paths */}
      <div>
        <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Explore Other Paths</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { title: 'Frontend Engineer', skills: 'React · TypeScript · CSS', modules: 7, hours: '52 hrs', color: '#DBEAFE' },
            { title: 'Data Engineer', skills: 'Python · SQL · Spark', modules: 8, hours: '68 hrs', color: '#D1FAE5' },
            { title: 'DevOps Engineer', skills: 'Docker · K8s · CI/CD', modules: 9, hours: '74 hrs', color: '#EDE9FE' },
          ].map((path) => (
            <div key={path.title} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: 20 }} className="card-hover">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: path.color, marginBottom: 12 }} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{path.title}</h4>
              <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>{path.skills}</p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>{path.modules} modules</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>{path.hours}</span>
              </div>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>Explore Path</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
