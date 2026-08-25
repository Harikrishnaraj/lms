import { Controller, Get } from '@nestjs/common'

@Controller('calendar')
export class CalendarController {
  @Get()
  getEvents() {
    return [
      { day: 14, title: 'Spring Boot Quiz', type: 'quiz', time: '11:59 PM', color: '#F59E0B', bg: '#FFFBEB' },
      { day: 15, title: 'Architecture Assignment Due', type: 'assignment', time: '5:00 PM', color: '#EF4444', bg: '#FEF2F2' },
      { day: 16, title: 'Microservices Assessment', type: 'assessment', time: '2:00 PM', color: '#2563EB', bg: '#EFF6FF' },
      { day: 18, title: 'Live Session: Docker Basics', type: 'live', time: '4:00 PM', color: '#10B981', bg: '#ECFDF5' },
      { day: 19, title: 'REST API Design Exam', type: 'assessment', time: '10:00 AM', color: '#2563EB', bg: '#EFF6FF' },
      { day: 22, title: 'Study Session: Cloud Fundamentals', type: 'study', time: '9:00 AM', color: '#8B5CF6', bg: '#F5F3FF' },
      { day: 24, title: 'System Design Assignment', type: 'assignment', time: '11:59 PM', color: '#EF4444', bg: '#FEF2F2' },
      { day: 26, title: 'Kubernetes Workshop (Live)', type: 'live', time: '3:00 PM', color: '#10B981', bg: '#ECFDF5' },
      { day: 30, title: 'Monthly Progress Review', type: 'study', time: '6:00 PM', color: '#8B5CF6', bg: '#F5F3FF' },
    ]
  }
}
