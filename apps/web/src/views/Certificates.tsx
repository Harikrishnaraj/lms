const earned = [
  { title: 'React & TypeScript Mastery', issuer: 'LearnSphere', date: 'Jun 14, 2025', id: 'LS-2025-4829', skills: ['React', 'TypeScript', 'Hooks', 'Testing'] },
  { title: 'REST API Design Fundamentals', issuer: 'LearnSphere', date: 'Apr 2, 2025', id: 'LS-2025-3102', skills: ['REST', 'OpenAPI', 'Security', 'Versioning'] },
  { title: 'Java Core Developer', issuer: 'LearnSphere', date: 'Feb 18, 2025', id: 'LS-2025-1847', skills: ['Java', 'OOP', 'Collections', 'Concurrency'] },
]

const inProgress = [
  { title: 'Java Backend Engineer', progress: 58, remaining: '4 modules remaining', color: '#2563EB' },
  { title: 'Spring Boot Specialist', progress: 80, remaining: '1 module remaining', color: '#10B981' },
]

export default function Certificates() {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Certificates</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Your earned credentials and certifications in progress</p>
      </div>

      {/* In progress */}
      <div style={{ marginBottom: 28 }}>
        <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>In Progress</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {inProgress.map((cert) => (
            <div key={cert.title} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{cert.title}</h4>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>LearnSphere Certification</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: cert.color, fontFamily: 'Manrope, sans-serif' }}>{cert.progress}%</span>
              </div>
              <div className="progress-bar-bg" style={{ height: 6, marginBottom: 8 }}>
                <div style={{ width: `${cert.progress}%`, height: '100%', background: cert.color, borderRadius: 100 }} />
              </div>
              <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>{cert.remaining}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Earned */}
      <div>
        <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Earned Certificates ({earned.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {earned.map((cert) => (
            <div key={cert.id} style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              {/* Certificate preview */}
              <div style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #1E40AF 100%)',
                padding: '28px 32px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', right: 10, top: 10, width: 100, height: 100, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.03)' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                      </div>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>LearnSphere</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Certificate of Completion</p>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 6px', fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.02em' }}>{cert.title}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Awarded to <span style={{ color: 'white', fontWeight: 600 }}>Alex Johnson</span></p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, marginLeft: 'auto' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="6" />
                        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                      </svg>
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Issued {cert.date}</p>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {cert.skills.map((s) => (
                    <span key={s} className="badge badge-blue" style={{ fontSize: 10 }}>{s}</span>
                  ))}
                  <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>ID: {cert.id}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    Share
                  </button>
                  <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
