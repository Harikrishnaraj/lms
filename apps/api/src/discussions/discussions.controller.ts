import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Controller('discussions')
export class DiscussionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getThreads() {
    const threads = await this.prisma.discussionThread.findMany({
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        user: true,
        course: true,
        replies: true,
      },
    })

    return threads.map((t) => ({
      id: t.id,
      title: t.title,
      author: t.user.name,
      avatar: t.user.avatar || 'U',
      course: t.course?.title || 'General',
      replies: t.replies.length,
      views: t.views,
      time: 'Just now', // Can use simple timestamp formatting
      pinned: t.pinned,
      tags: t.tags ? t.tags.split(',') : [],
    }))
  }

  @Get(':id')
  async getThreadDetails(@Param('id') id: string) {
    // Increment view count
    await this.prisma.discussionThread.update({
      where: { id },
      data: { views: { increment: 1 } },
    })

    const thread = await this.prisma.discussionThread.findUnique({
      where: { id },
      include: {
        user: true,
        course: true,
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: true },
        },
      },
    })

    if (!thread) {
      return { error: 'Thread not found' }
    }

    return {
      id: thread.id,
      title: thread.title,
      author: thread.user.name,
      avatar: thread.user.avatar || 'U',
      course: thread.course?.title || 'General',
      time: 'Recently',
      pinned: thread.pinned,
      tags: thread.tags ? thread.tags.split(',') : [],
      replies: thread.replies.map((r) => ({
        avatar: r.user.avatar || 'U',
        name: r.user.name + (r.isInstructor ? ' (Instructor)' : ' (You)'),
        text: r.text,
        time: 'recently',
        isInstructor: r.isInstructor,
      })),
    }
  }

  @Post()
  async createThread(
    @Body() body: { title: string; courseId?: string; tags: string[] }
  ) {
    const userId = 'alex-johnson-uuid'
    const newThread = await this.prisma.discussionThread.create({
      data: {
        title: body.title,
        courseId: body.courseId || null,
        userId,
        tags: body.tags.join(','),
        views: 1,
      },
    })

    return { success: true, threadId: newThread.id }
  }

  @Post(':id/reply')
  async postReply(
    @Param('id') threadId: string,
    @Body() body: { text: string }
  ) {
    const userId = 'alex-johnson-uuid'
    
    // Simple logic: if user is instructor (not Alex), set instructor = true
    // Since Alex is a student, we set it as false
    const reply = await this.prisma.discussionReply.create({
      data: {
        threadId,
        userId,
        text: body.text,
        isInstructor: false,
      },
    })

    return { success: true, replyId: reply.id }
  }
}
