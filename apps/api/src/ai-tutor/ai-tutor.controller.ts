import { Controller, Get, Post, Body } from '@nestjs/common'
import { GoogleGenerativeAI } from '@google/generative-ai'

type Msg = { role: 'user' | 'ai'; text: string; time: string }

const defaultHistory: Msg[] = [
  {
    role: 'ai',
    text: "Hi Alex! I'm your AI Tutor. I'm connected to your current course — Advanced Java & Spring Boot, Module 4 · Microservices Architecture. What would you like to learn or review today?",
    time: '10:42 AM',
  },
]

const aiResponses: Record<string, string> = {
  default: "Great question! Let me explain that concept clearly. In microservices architecture, each service is independently deployable and communicates via APIs. This enables teams to develop, test, and scale services independently, improving agility and fault isolation.",
  quiz: "Sure! Let's do a quick quiz. Here's your first question:\n\n**Q: What is the main purpose of an API Gateway in microservices?**\n\nA) To store data\nB) To act as a single entry point handling routing, auth, and rate limiting\nC) To manage databases\nD) To replicate services\n\nType A, B, C, or D!",
  explain: "Service discovery is the mechanism by which microservices find each other. There are two patterns:\n\n**1. Client-side discovery** — the client queries a service registry (like Eureka) and selects an instance.\n\n**2. Server-side discovery** — the client sends requests to a load balancer, which queries the registry.\n\nSpring Cloud Netflix Eureka is the most common client-side discovery tool in the Java ecosystem.",
  summarize: "Here's a summary of your current lesson:\n\n**Microservices Architecture — Key Takeaways:**\n• Services are loosely coupled and independently deployable\n• Each service owns its data (Database-per-service pattern)\n• Communication happens via REST or messaging (Kafka, RabbitMQ)\n• Service discovery (Eureka) handles dynamic instance lookup\n• API Gateway handles cross-cutting concerns like auth and routing\n\nYou're 45% through this module. Keep going! 🚀",
}

@Controller('ai-tutor')
export class AITutorController {
  private chatHistory: Msg[] = [...defaultHistory]

  @Get('history')
  getHistory() {
    return this.chatHistory
  }

  @Post('chat')
  async chat(@Body() body: { text: string }) {
    const text = body.text
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    // Add user message to history
    this.chatHistory.push({ role: 'user', text, time: nowTime })

    let responseText = ''
    const apiKey = process.env.GEMINI_API_KEY

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        
        // System instruction or prompt formatting
        const prompt = `You are a friendly, helpful AI tutor in a Learning Management System. The student is Alex Johnson.
Current Course: Advanced Java & Spring Boot, Module 4 (Microservices Architecture).
Here is the student message: ${text}
Provide a clear, engaging educational response.`
        
        const result = await model.generateContent(prompt)
        responseText = result.response.text()
      } catch (err) {
        console.error('Error generating AI response via Gemini:', err)
        responseText = this.generateMockResponse(text) + '\n\n*(Note: Fallback response used due to Gemini API connection error.)*'
      }
    } else {
      responseText = this.generateMockResponse(text)
    }

    const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const aiMsg: Msg = { role: 'ai', text: responseText, time: aiTime }
    
    // Add AI message to history
    this.chatHistory.push(aiMsg)

    return aiMsg
  }

  private generateMockResponse(text: string): string {
    const lower = text.toLowerCase()
    if (lower.includes('quiz')) return aiResponses.quiz
    if (lower.includes('explain') || lower.includes('service discovery')) return aiResponses.explain
    if (lower.includes('summarize') || lower.includes('summary')) return aiResponses.summarize
    return aiResponses.default
  }
}
