const weekData = [4, 6, 3, 8, 5, 7, 2]
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const maxHours = Math.max(...weekData)

const assessmentData = [
  { name: 'Java Quiz 1', score: 88, date: 'Jun 12' },
  { name: 'Spring Boot', score: 92, date: 'Jul 3' },
  { name: 'REST APIs', score: 76, date: 'Jul 24' },
  { name: 'Microservices', score: 84, date: 'Aug 10' },
]

const skills = [
  { name: 'Java', level: 85 },
  { name: 'Spring Boot', level: 78 },
  { name: 'REST APIs', level: 90 },
  { name: 'Microservices', level: 55 },
  { name: 'Docker', level: 40 },
  { name: 'AWS', level: 20 },
]

const courseProgress = [
  { title: 'Advanced Java & Spring Boot', progress: 68, color: '#2563EB' },
  { title: 'System Design Fundamentals', progress: 40, color: '#8B5CF6' },
  { title: 'React & TypeScript Mastery', progress: 100, color: '#10B981' },
  { title: 'AWS Solutions Architect', progress: 15, color: '#F59E0B' },
]

export default function Progress() {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>My Progress</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Track your learning journey and skill development</p>
      </div>

      {/* Top stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Overall Completion', value: '58%', sub: 'Across learning path', icon: '🎯', color: '#2563EB' },
          { label: 'Hours Learned', value: '24.5', sub: 'This month', icon: '⏱', color: '#8B5CF6' },
          { label: 'Assessment Avg', value: '85%', sub: 'Across all quizzes', icon: '📊', color: '#10B981' },
          { label: 'Learning Streak', value: '12 days', sub: 'Personal best: 21 days', icon: '🔥', color: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '18px 20px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <p className="font-display" style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{s.label}</p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Activity + Skills row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Weekly activity */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
          <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Weekly Learning Activity</h3>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 20px' }}>Hours studied this week · Avg 5.0 hrs/day</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
            {weekData.map((hrs, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>{hrs}h</span>
                <div style={{ width: '100%', position: 'relative', height: 90, display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${(hrs / maxHours) * 90}px`,
                      background: i === 3 ? '#2563EB' : '#DBEAFE',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: i === 3 ? '#2563EB' : '#94A3B8', fontWeight: i === 3 ? 700 : 400 }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assessment performance */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
          <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Assessment Performance</h3>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 20px' }}>Score trend · Pass threshold: 75%</p>
          <div style={{ position: 'relative', height: 120 }}>
            {/* Y axis labels */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {['100%', '75%', '50%'].map((l) => (
                <span key={l} style={{ fontSize: 10, color: '#94A3B8' }}>{l}</span>
              ))}
            </div>
            {/* Chart area */}
            <div style={{ marginLeft: 30, height: '100%', display: 'flex', alignItems: 'flex-end', gap: 0, borderBottom: '1px solid #E2E8F0', position: 'relative' }}>
              {/* 75% pass line */}
              <div style={{ position: 'absolute', bottom: '37%', left: 0, right: 0, borderTop: '1px dashed #FDE68A', zIndex: 1 }}>
                <span style={{ fontSize: 9, color: '#B45309', position: 'absolute', right: 0, top: -8 }}>Pass line</span>
              </div>
              {assessmentData.map((a, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingBottom: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0F172A' }}>{a.score}%</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '70%' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${a.score}%`,
                        background: a.score >= 75 ? 'linear-gradient(180deg, #34D399, #10B981)' : 'linear-gradient(180deg, #F87171, #EF4444)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: '#64748B', whiteSpace: 'nowrap' }}>{a.name}</span>
                  <span style={{ fontSize: 9, color: '#94A3B8' }}>{a.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Course progress + Skills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Course progress */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
          <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Course Progress</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {courseProgress.map((c) => (
              <div key={c.title}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{c.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.progress}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: 6 }}>
                  <div style={{ width: `${c.progress}%`, height: '100%', background: c.color, borderRadius: 100 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
          <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Skills Gained</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {skills.map((s) => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0F172A' }}>{s.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748B' }}>
                      {s.level < 40 ? 'Beginner' : s.level < 70 ? 'Intermediate' : 'Advanced'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.level >= 70 ? '#10B981' : s.level >= 40 ? '#2563EB' : '#F59E0B' }}>{s.level}%</span>
                  </div>
                </div>
                <div className="progress-bar-bg" style={{ height: 5 }}>
                  <div style={{
                    width: `${s.level}%`,
                    height: '100%',
                    background: s.level >= 70 ? '#10B981' : s.level >= 40 ? '#2563EB' : '#F59E0B',
                    borderRadius: 100,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
