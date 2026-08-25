import { useState } from 'react'

type Msg = { role: 'user' | 'ai'; text: string; time: string }

const initMessages: Msg[] = [
  {
    role: 'ai',
    text: "Hi Alex! I'm your AI Tutor. I'm connected to your current course — Advanced Java & Spring Boot, Module 4 · Microservices Architecture. What would you like to learn or review today?",
    time: '10:42 AM',
  },
]

const suggestions = [
  { icon: '💡', label: 'Explain this concept', prompt: 'Explain service discovery in microservices' },
  { icon: '📝', label: 'Give me an example', prompt: 'Give me a code example of Spring Cloud Eureka setup' },
  { icon: '🧠', label: 'Quiz me', prompt: 'Quiz me on microservices patterns I\'ve studied' },
  { icon: '📖', label: 'Summarize this lesson', prompt: 'Summarize the current lesson on Microservices Architecture' },
]

const aiResponses: Record<string, string> = {
  default: "Great question! Let me explain that concept clearly. In microservices architecture, each service is independently deployable and communicates via APIs. This enables teams to develop, test, and scale services independently, improving agility and fault isolation.",
  quiz: "Sure! Let's do a quick quiz. Here's your first question:\n\n**Q: What is the main purpose of an API Gateway in microservices?**\n\nA) To store data\nB) To act as a single entry point handling routing, auth, and rate limiting\nC) To manage databases\nD) To replicate services\n\nType A, B, C, or D!",
  explain: "Service discovery is the mechanism by which microservices find each other. There are two patterns:\n\n**1. Client-side discovery** — the client queries a service registry (like Eureka) and selects an instance.\n\n**2. Server-side discovery** — the client sends requests to a load balancer, which queries the registry.\n\nSpring Cloud Netflix Eureka is the most common client-side discovery tool in the Java ecosystem.",
  summarize: "Here's a summary of your current lesson:\n\n**Microservices Architecture — Key Takeaways:**\n• Services are loosely coupled and independently deployable\n• Each service owns its data (Database-per-service pattern)\n• Communication happens via REST or messaging (Kafka, RabbitMQ)\n• Service discovery (Eureka) handles dynamic instance lookup\n• API Gateway handles cross-cutting concerns like auth and routing\n\nYou're 45% through this module. Keep going! 🚀",
}

export default function AITutor() {
  const [messages, setMessages] = useState<Msg[]>(initMessages)
  const [input, setInput] = useState('')

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const getResponse = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('quiz')) return aiResponses.quiz
    if (lower.includes('explain') || lower.includes('service discovery')) return aiResponses.explain
    if (lower.includes('summarize') || lower.includes('summary')) return aiResponses.summarize
    return aiResponses.default
  }

  const send = (text: string) => {
    if (!text.trim()) return
    const t = now()
    setMessages((prev) => [...prev, { role: 'user', text, time: t }])
    setInput('')
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'ai', text: getResponse(text), time: now() }])
    }, 900)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <div>
          <h1 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.02em' }}>AI Tutor</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 12, color: '#64748B' }}>Active · Advanced Java & Spring Boot · Module 4</span>
          </div>
        </div>
      </div>

      {/* Context card */}
      <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
        <p style={{ fontSize: 12, color: '#5B21B6', margin: 0 }}>
          <strong>Current context:</strong> Spring Data JPA — Repository Pattern · Lesson 3 of 8 · 35% watched
        </p>
      </div>

      {/* Suggested prompts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {suggestions.map((s) => (
          <button
            key={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 100,
              border: '1px solid #DDD6FE',
              background: '#F5F3FF',
              color: '#7C3AED',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EDE9FE' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5F3FF' }}
            onClick={() => send(s.prompt)}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            {msg.role === 'ai' && (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              </div>
            )}
            {msg.role === 'user' && (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: 13, fontWeight: 700 }}>
                A
              </div>
            )}
            <div style={{ maxWidth: '75%' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? '#2563EB' : '#FFFFFF',
                color: msg.role === 'user' ? 'white' : '#0F172A',
                fontSize: 13,
                lineHeight: 1.6,
                border: msg.role === 'ai' ? '1px solid #E2E8F0' : 'none',
                boxShadow: msg.role === 'ai' ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
                whiteSpace: 'pre-line',
              }}>
                {msg.text}
              </div>
              <p style={{ fontSize: 10, color: '#94A3B8', margin: '3px 4px 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          placeholder="Ask your AI Tutor anything about this lesson..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 13,
            color: '#0F172A',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5,
            minHeight: 20,
            maxHeight: 100,
            background: 'transparent',
          }}
          rows={1}
        />
        <button
          style={{ width: 38, height: 38, borderRadius: 10, background: '#8B5CF6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onClick={() => send(input)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', margin: '8px 0 0' }}>AI Tutor is context-aware of your current lesson. Press Enter to send.</p>
    </div>
  )
}
