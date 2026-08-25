import { Controller, Get, Param, Post } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Controller('courses')
export class CoursesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getCourses() {
    const userId = 'alex-johnson-uuid'
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  include: {
                    progresses: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    return enrollments.map((env) => {
      const course = env.course
      let totalLessons = 0
      let completedLessons = 0
      let currentModuleTitle = 'All modules complete'

      course.modules.forEach((mod) => {
        let moduleCompleted = true
        mod.lessons.forEach((les) => {
          totalLessons++
          if (les.progresses[0]?.completed) {
            completedLessons++
          } else {
            moduleCompleted = false
          }
        });
        
        // Find current module: first module that is not completely done
        if (!moduleCompleted && currentModuleTitle === 'All modules complete') {
          currentModuleTitle = `${mod.title}`
        }
      })

      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
      const status = progress === 100 ? 'completed' : 'in-progress'

      return {
        id: course.id,
        title: course.title,
        instructor: course.instructor,
        progress,
        module: progress === 100 ? 'All modules complete' : `Current: ${currentModuleTitle}`,
        lastAccessed: 'Active',
        remaining: course.duration || '—',
        img: course.image,
        difficulty: course.difficulty,
        status,
        lessons: `${completedLessons} / ${totalLessons}`,
        enrolled: env.enrolledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }
    })
  }

  @Get(':id')
  async getCourseDetails(@Param('id') id: string) {
    const userId = 'alex-johnson-uuid'
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                progresses: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    })

    if (!course) {
      return { error: 'Course not found' }
    }

    let foundCurrent = false

    const modules = course.modules.map((mod) => {
      const lessons = mod.lessons.map((les) => {
        const done = les.progresses[0]?.completed || false
        let current = false
        let locked = false

        // Logic for current/locked:
        // First lesson that is NOT completed becomes 'current'
        if (!done && !foundCurrent) {
          current = true
          foundCurrent = true
        } else if (!done && foundCurrent) {
          // If we already found a current lesson, future uncompleted lessons in locked modules are locked
          locked = true
        }

        return {
          id: les.id,
          title: les.title,
          duration: les.duration,
          done,
          current,
          locked,
        }
      })

      return {
        title: mod.title,
        lessons,
      }
    })

    return {
      id: course.id,
      title: course.title,
      instructor: course.instructor,
      modules,
      resources: [
        { name: 'Microservices Cheat Sheet.pdf', size: '1.2 MB' },
        { name: 'Spring Boot Reference Guide', size: 'External link' },
        { name: 'Lab Exercise Files.zip', size: '3.8 MB' },
      ],
      notes: [
        { time: '04:32', text: 'Service discovery uses Eureka by default in Spring Cloud' },
        { time: '11:15', text: 'Remember: sidecar pattern vs. service mesh trade-offs' },
      ],
    }
  }

  @Post(':id/lessons/:lessonId/complete')
  async completeLesson(@Param('id') courseId: string, @Param('lessonId') lessonId: string) {
    const userId = 'alex-johnson-uuid'

    // Upsert lesson progress
    await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {
        completed: true,
      },
      create: {
        userId,
        lessonId,
        completed: true,
      },
    })

    // Calculate user progress across all courses and update user profile
    const allEnrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  include: {
                    progresses: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    let totalLessonsCount = 0
    let completedLessonsCount = 0

    allEnrollments.forEach((env) => {
      env.course.modules.forEach((mod) => {
        mod.lessons.forEach((les) => {
          totalLessonsCount++
          if (les.progresses[0]?.completed || les.id === lessonId) {
            completedLessonsCount++
          }
        })
      })
    })

    const overallProgressVal = totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        overallProgress: overallProgressVal,
      },
    })

    return { success: true, overallProgress: overallProgressVal }
  }
}
