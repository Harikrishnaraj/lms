import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getDashboardData() {
    // Fetch Alex Johnson
    const user = await this.prisma.user.findUnique({
      where: { id: 'alex-johnson-uuid' },
    })

    if (!user) {
      return { error: 'User not found' }
    }

    // Milestones status (Hardcoded or based on modules/lessons done)
    const milestones = [
      { label: 'Java Fundamentals', status: 'completed' },
      { label: 'Spring Boot', status: 'completed' },
      { label: 'REST APIs', status: 'completed' },
      { label: 'Microservices', status: 'current' },
      { label: 'Cloud & DevOps', status: 'upcoming' },
      { label: 'Capstone Project', status: 'locked' },
    ]

    // Tasks for today
    const todayTasks = [
      { id: 't1', title: 'Complete Spring Boot Quiz', course: 'Advanced Java & Spring Boot', due: 'Today, 11:59 PM', time: '25 min', type: 'quiz', status: 'pending' },
      { id: 't2', title: 'Watch Microservices lesson', course: 'Microservices Architecture', due: 'Today', time: '18 min', type: 'lesson', status: 'in-progress' },
      { id: 't3', title: 'Submit Architecture Assignment', course: 'System Design Fundamentals', due: 'Tomorrow, 5:00 PM', time: '90 min', type: 'assignment', status: 'pending' },
    ]

    // Recommended courses
    const recommendations = [
      { title: 'Kubernetes & Container Orchestration', instructor: 'Dr. Sarah Chen', rating: 4.9, duration: '12h 30m', difficulty: 'Intermediate', skills: ['Kubernetes', 'Docker', 'DevOps'], img: 'photo-1667372393119-3d4c48d07fc9' },
      { title: 'System Design: The Complete Guide', instructor: 'Marcus Rivera', rating: 4.8, duration: '18h 15m', difficulty: 'Advanced', skills: ['Architecture', 'Scalability'], img: 'photo-1555066931-4365d14bab8c' },
      { title: 'AWS Cloud Practitioner', instructor: 'Elena Volkov', rating: 4.7, duration: '8h 45m', difficulty: 'Beginner', skills: ['AWS', 'Cloud', 'Infrastructure'], img: 'photo-1451187580459-43490279c0fa' },
    ]

    // Fetch active course: Advanced Java & Spring Boot
    const activeCourse = await this.prisma.course.findUnique({
      where: { id: 'course-java-springboot' },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                progresses: {
                  where: { userId: user.id },
                },
              },
            },
          },
        },
      },
    })

    let activeCourseProgress = 0
    let totalLessons = 0
    let completedLessons = 0
    let lastAccessedLesson = 'OOP Principles'

    if (activeCourse) {
      activeCourse.modules.forEach((mod) => {
        mod.lessons.forEach((les) => {
          totalLessons++
          if (les.progresses[0]?.completed) {
            completedLessons++
          }
        });
      });
      activeCourseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
      
      // Let's set some mock details for current progress in active course
      lastAccessedLesson = 'Spring Data JPA'
    }

    return {
      user: {
        name: user.name,
        avatar: user.avatar,
        streakDays: user.streakDays,
        overallProgress: `${user.overallProgress}%`,
        hoursLearned: `${user.hoursLearned} hrs`,
      },
      milestones,
      todayTasks,
      recommendations,
      activeCourse: {
        id: 'course-java-springboot',
        title: 'Advanced Java & Spring Boot',
        module: 'Module 2 · Spring Boot Essentials',
        progress: activeCourseProgress,
        remaining: '42 min remaining',
        lastAccessed: '2h ago',
        lessonCount: `${completedLessons} / ${totalLessons}`,
        currentLesson: `Lesson 3 of 8 · ${lastAccessedLesson}`,
      },
    }
  }
}
