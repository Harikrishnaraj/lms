import { Controller, Get, Param, Post, Body } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Controller('assessments')
export class AssessmentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAssessments() {
    const userId = 'alex-johnson-uuid'
    const assessments = await this.prisma.assessment.findMany({
      include: {
        course: true,
        attempts: {
          where: { userId },
        },
        questions: true,
      },
    })

    let totalScoreSum = 0
    let completedCount = 0

    const formattedAssessments = assessments.map((a) => {
      const questionsCount = a.questions.length
      const attempt = a.attempts[0] // Get first attempt if exists
      const score = attempt ? attempt.score : null
      const status = attempt ? 'completed' : a.status // available, upcoming, completed

      if (attempt) {
        totalScoreSum += attempt.score
        completedCount++
      }

      return {
        id: a.id,
        name: a.name,
        course: a.course.title,
        type: a.type,
        questions: questionsCount || 20, // default if no questions seeded
        duration: a.duration,
        passing: a.passing,
        due: a.due || 'Not specified',
        attempts: attempt ? 'Completed' : '3 remaining',
        status,
        score,
      }
    })

    const avgScore = completedCount > 0 ? Math.round(totalScoreSum / completedCount) : 85

    return {
      stats: {
        total: formattedAssessments.length,
        available: formattedAssessments.filter((a) => a.status === 'available').length,
        upcoming: formattedAssessments.filter((a) => a.status === 'upcoming').length,
        avgScore: `${avgScore}%`,
      },
      assessments: formattedAssessments,
    }
  }

  @Get(':id/quiz')
  async getQuizQuestions(@Param('id') id: string) {
    const questions = await this.prisma.question.findMany({
      where: { assessmentId: id },
    })

    return questions.map((q) => ({
      id: q.id,
      q: q.text,
      options: JSON.parse(q.options),
      explanation: q.explanation,
    }))
  }

  @Post(':id/submit')
  async submitQuiz(
    @Param('id') id: string,
    @Body() body: { answers: Record<number, number> }
  ) {
    const userId = 'alex-johnson-uuid'
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: { questions: true },
    })

    if (!assessment) {
      return { error: 'Assessment not found' }
    }

    const questions = assessment.questions
    let correctCount = 0

    // Grade answers
    const results = questions.map((q, idx) => {
      const userAnswer = body.answers[idx]
      const isCorrect = userAnswer === q.correctIndex
      if (isCorrect) correctCount++

      return {
        questionIndex: idx,
        correct: isCorrect,
        correctOption: q.correctIndex,
        explanation: q.explanation,
      }
    })

    const scorePct = Math.round((correctCount / questions.length) * 100)
    const passingThreshold = parseInt(assessment.passing.replace('%', '')) || 75
    const passed = scorePct >= passingThreshold

    // Save attempt
    await this.prisma.quizAttempt.create({
      data: {
        userId,
        assessmentId: id,
        score: scorePct,
        passed,
        answers: JSON.stringify(body.answers),
      },
    })

    return {
      score: scorePct,
      correctCount,
      totalCount: questions.length,
      passed,
      results,
    }
  }
}
