import { Controller, Get, Param, Post } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getNotifications() {
    const userId = 'alex-johnson-uuid'
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    })
    return { success: true }
  }
}
