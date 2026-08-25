import { useState } from 'react'
import type { View } from '../types'

const questions = [
  {
    q: 'Which annotation in Spring Boot is used to mark a class as a REST controller?',
    options: ['@Controller', '@RestController', '@Service', '@Component'],
    correct: 1,
    explanation: '@RestController is a convenience annotation combining @Controller and @ResponseBody, making every method return data directly to the response body as JSON.',
  },
  {
    q: 'In Spring Data JPA, what does the findBy prefix in method names signify?',
    options: ['It marks a repository method', 'It generates a SELECT query based on the field name following it', 'It finds a bean in the context', 'It performs a delete operation'],
    correct: 1,
    explanation: 'Spring Data JPA parses method names to generate queries. findByEmail() generates SELECT ... WHERE email = ?.',
  },
  {
    q: 'What is the primary purpose of @Transactional in Spring?',
    options: ['To define HTTP endpoints', 'To inject dependencies', 'To manage database transaction boundaries', 'To cache method results'],
    correct: 2,
    explanation: '@Transactional ensures that a method runs within a database transaction, providing atomicity, consistency, isolation, and durability (ACID) properties.',
  },
  {
    q: 'Which HTTP status code indicates a successful resource creation in REST APIs?',
    options: ['200 OK', '201 Created', '204 No Content', '202 Accepted'],
    correct: 1,
    explanation: '201 Created is the correct response for successful POST requests that create a new resource. The Location header should point to the new resource.',
  },
  {
    q: 'In microservices, what is the role of an API Gateway?',
    options: [
      'Directly connecting services to the database',
      'Acting as a single entry point for clients, handling routing, auth, and rate limiting',
      'Managing the service registry',
      'Replicating data across services',
    ],
    correct: 1,
    explanation: 'An API Gateway is the single entry point for all client requests. It handles cross-cutting concerns like authentication, rate limiting, and request routing.',
  },
]

type Phase = 'intro' | 'taking' | 'result'

interface Props {
  onNavigate: (view: View) => void
}

export default function Quiz({ onNavigate }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [selected, setSelected] = useState<number | null>(null)
  const [timeLeft] = useState(25 * 60)

  const score = answers.filter((a, i) => a === questions[i].correct).length
  const pct = Math.round((score / questions.length) * 100)
  const passed = pct >= 75

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const handleAnswer = (idx: number) => {
    setSelected(idx)
  }

  const handleNext = () => {
    const newAnswers = [...answers]
    newAnswers[current] = selected
    setAnswers(newAnswers)
    setSelected(null)
    if (current < questions.length - 1) {
      setCurrent(current + 1)
    } else {
      setPhase('result')
    }
  }

  if (phase === 'intro') {
    return (
      <div style={{ padding: '40px 32px', maxWidth: 640, margin: '0 auto' }}>
        <button className="btn-secondary" style={{ marginBottom: 24, fontSize: 12 }} onClick={() => onNavigate('dashboard')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Dashboard
        </button>

        <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', padding: 36, textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Microservices Architecture Quiz
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 28px' }}>Advanced Java & Spring Boot · Module 4</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Questions', value: '5', icon: '📝' },
              { label: 'Duration', value: '25 min', icon: '⏱' },
              { label: 'Passing Score', value: '75%', icon: '🎯' },
              { label: 'Attempts Left', value: '2 of 2', icon: '🔄' },
            ].map((s) => (
              <div key={s.label} style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{s.value}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 16px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FEF3C7', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#B45309', margin: '0 0 4px' }}>Instructions</p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {['All questions are single-choice.', 'You can navigate between questions freely.', 'Your progress is auto-saved.', 'You\'ll see detailed explanations after submission.'].map((item) => (
                <li key={item} style={{ fontSize: 12, color: '#92400E', marginBottom: 2 }}>{item}</li>
              ))}
            </ul>
          </div>

          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 15, borderRadius: 10 }} onClick={() => setPhase('taking')}>
            Start Assessment
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <div style={{ padding: '40px 32px', maxWidth: 700, margin: '0 auto' }}>
        <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', padding: 36 }}>
          {/* Result header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: passed ? '#ECFDF5' : '#FEF2F2', border: `3px solid ${passed ? '#10B981' : '#EF4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {passed ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              )}
            </div>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {passed ? 'Congratulations! 🎉' : 'Keep Practicing'}
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
              {passed ? 'You passed the assessment with a great score!' : 'You\'re close! Review the material and try again.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Score', value: `${pct}%`, color: passed ? '#10B981' : '#EF4444' },
              { label: 'Correct', value: `${score} / ${questions.length}`, color: '#2563EB' },
              { label: 'Status', value: passed ? 'Passed' : 'Failed', color: passed ? '#10B981' : '#EF4444' },
            ].map((s) => (
              <div key={s.label} style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <p className="font-display" style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{s.value}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Review answers */}
          <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Answer Review</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {questions.map((q, qi) => {
              const userAns = answers[qi]
              const isCorrect = userAns === q.correct
              return (
                <div key={qi} style={{ padding: 16, borderRadius: 12, border: `1px solid ${isCorrect ? '#A7F3D0' : '#FECACA'}`, background: isCorrect ? '#ECFDF5' : '#FEF2F2' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: isCorrect ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isCorrect ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      )}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0, flex: 1 }}>Q{qi + 1}: {q.q}</p>
                  </div>
                  {!isCorrect && (
                    <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 6px 28px' }}>
                      Your answer: <span style={{ color: '#EF4444', fontWeight: 500 }}>{q.options[userAns ?? 0]}</span> · Correct: <span style={{ color: '#10B981', fontWeight: 500 }}>{q.options[q.correct]}</span>
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: '#374151', margin: '6px 0 0 28px', lineHeight: 1.5, fontStyle: 'italic' }}>{q.explanation}</p>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onNavigate('dashboard')}>Back to Dashboard</button>
            {!passed && (
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setPhase('intro'); setAnswers(Array(questions.length).fill(null)); setCurrent(0) }}>
                Retake Quiz
              </button>
            )}
            {passed && (
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#10B981' }} onClick={() => onNavigate('course-player')}>
                Continue Learning
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const progressPct = ((current + 1) / questions.length) * 100

  return (
    <div style={{ padding: '32px', maxWidth: 740, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 2px' }}>Microservices Architecture Quiz</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>Question {current + 1} of {questions.length}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FDE68A' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#B45309', fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeLeft)}</span>
          </div>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px', color: '#EF4444', borderColor: '#FECACA', background: '#FEF2F2' }} onClick={() => setPhase('result')}>
            Submit Early
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 28 }}>
        <div className="progress-bar-bg" style={{ height: 6 }}>
          <div className="progress-bar-fill" style={{ width: `${progressPct}%`, height: '100%', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {questions.map((_, qi) => (
            <div
              key={qi}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                background: qi === current ? '#2563EB' : answers[qi] !== null ? '#DBEAFE' : '#F1F5F9',
                color: qi === current ? 'white' : answers[qi] !== null ? '#1D4ED8' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => { const a = [...answers]; a[current] = selected; setAnswers(a); setSelected(answers[qi] ?? null); setCurrent(qi) }}
            >
              {qi + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Question card */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 28, marginBottom: 20 }}>
        <h2 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 24px', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
          {q.q}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map((opt, oi) => (
            <button
              key={oi}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 10,
                border: `2px solid ${selected === oi ? '#2563EB' : '#E2E8F0'}`,
                background: selected === oi ? '#EFF6FF' : '#F8FAFC',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onClick={() => handleAnswer(oi)}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: `2px solid ${selected === oi ? '#2563EB' : '#CBD5E1'}`,
                background: selected === oi ? '#2563EB' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {selected === oi && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
              </div>
              <span style={{ fontSize: 14, color: selected === oi ? '#1D4ED8' : '#0F172A', fontWeight: selected === oi ? 500 : 400 }}>{opt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-secondary" disabled={current === 0} onClick={() => { const a = [...answers]; a[current] = selected; setAnswers(a); setSelected(answers[current - 1] ?? null); setCurrent(current - 1) }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Previous
        </button>
        <span style={{ fontSize: 12, color: '#64748B' }}>
          {answers.filter(a => a !== null).length} of {questions.length} answered
        </span>
        <button className="btn-primary" disabled={selected === null} onClick={handleNext}>
          {current === questions.length - 1 ? 'Submit Quiz' : 'Next'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  )
}
