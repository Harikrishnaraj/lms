import type { View } from '../types'

const courses = [
  {
    title: 'Advanced Java & Spring Boot',
    instructor: 'Dr. James Wilson',
    progress: 68,
    module: 'Module 4 · Microservices',
    lastAccessed: '2 hours ago',
    remaining: '42 min',
    img: 'photo-1555066931-4365d14bab8c',
    difficulty: 'Advanced',
    status: 'in-progress',
    lessons: '5 / 9',
    enrolled: 'Mar 12, 2025',
  },
  {
    title: 'System Design Fundamentals',
    instructor: 'Sarah Kim',
    progress: 40,
    module: 'Module 2 · Database Design',
    lastAccessed: '3 days ago',
    remaining: '3.5 hrs',
    img: 'photo-1451187580459-43490279c0fa',
    difficulty: 'Intermediate',
    status: 'in-progress',
    lessons: '4 / 10',
    enrolled: 'Apr 5, 2025',
  },
  {
    title: 'React & TypeScript Mastery',
    instructor: 'Marcus Rivera',
    progress: 100,
    module: 'All modules complete',
    lastAccessed: '2 weeks ago',
    remaining: '—',
    img: 'photo-1633356122544-f134324a6cee',
    difficulty: 'Intermediate',
    status: 'completed',
    lessons: '12 / 12',
    enrolled: 'Jan 8, 2025',
  },
  {
    title: 'AWS Solutions Architect',
    instructor: 'Elena Volkov',
    progress: 15,
    module: 'Module 1 · Cloud Basics',
    lastAccessed: 'Yesterday',
    remaining: '14 hrs',
    img: 'photo-1667372393119-3d4c48d07fc9',
    difficulty: 'Advanced',
    status: 'in-progress',
    lessons: '2 / 14',
    enrolled: 'Jul 20, 2025',
  },
]

interface Props {
  onNavigate: (view: View) => void
}

export default function MyLearning({ onNavigate }: Props) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>My Learning</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>4 enrolled courses · 1 completed</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'In Progress', 'Completed', 'Saved'].map((f) => (
            <button
              key={f}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                background: f === 'All' ? '#0F172A' : '#FFFFFF',
                color: f === 'All' ? 'white' : '#64748B',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {courses.map((course, i) => (
          <div
            key={i}
            className="card-hover"
            style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => onNavigate('course-player')}
          >
            <div style={{ height: 140, position: 'relative', background: '#0F172A' }}>
              <img
                src={`https://images.unsplash.com/${course.img}?w=600&h=280&fit=crop&auto=format`}
                alt={course.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: course.status === 'completed' ? 0.4 : 0.6 }}
              />
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                <span className={`badge ${course.difficulty === 'Advanced' ? 'badge-purple' : 'badge-blue'}`}>{course.difficulty}</span>
                {course.status === 'completed' && <span className="badge badge-green">Completed</span>}
              </div>
              <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                <div className="progress-bar-bg" style={{ height: 4, background: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ width: `${course.progress}%`, height: '100%', background: course.status === 'completed' ? '#10B981' : '#2563EB', borderRadius: 100 }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.01em' }}>{course.title}</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>by {course.instructor}</p>

              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                {[
                  { label: 'Progress', value: `${course.progress}%` },
                  { label: 'Lessons', value: course.lessons },
                  { label: 'Last accessed', value: course.lastAccessed },
                ].map((s) => (
                  <div key={s.label}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 1px' }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                  {course.status !== 'completed' ? `📍 ${course.module}` : '✅ All modules complete'}
                </p>
                {course.status !== 'completed' ? (
                  <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); onNavigate('course-player') }}>
                    Continue
                  </button>
                ) : (
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                    Review
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
