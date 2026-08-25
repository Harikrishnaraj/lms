import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const defaultPasswordHash = await bcrypt.hash('password123', 10)
  console.log('Clearing database...')
  await prisma.certificate.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.discussionReply.deleteMany()
  await prisma.discussionThread.deleteMany()
  await prisma.quizAttempt.deleteMany()
  await prisma.question.deleteMany()
  await prisma.assessment.deleteMany()
  await prisma.lessonProgress.deleteMany()
  await prisma.courseEnrollment.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.courseModule.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()

  console.log('Seeding database...')

  // Create User
  const alex = await prisma.user.create({
    data: {
      id: 'alex-johnson-uuid',
      email: 'alex.johnson@lms.com',
      name: 'Alex Johnson',
      password: defaultPasswordHash,
      avatar: 'A',
      emailVerified: false,
      role: 'student',
      streakDays: 12,
      overallProgress: 68.0,
      hoursLearned: 24.5,
    },
  })

  // Courses
  const c1 = await prisma.course.create({
    data: {
      id: 'course-java-springboot',
      title: 'Advanced Java & Spring Boot',
      instructor: 'Dr. James Wilson',
      difficulty: 'Advanced',
      duration: '42 min remaining',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=240&h=160&fit=crop&auto=format',
    },
  })

  const c2 = await prisma.course.create({
    data: {
      id: 'course-system-design',
      title: 'System Design Fundamentals',
      instructor: 'Sarah Kim',
      difficulty: 'Intermediate',
      duration: '3.5 hrs remaining',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=240&h=160&fit=crop&auto=format',
    },
  })

  const c3 = await prisma.course.create({
    data: {
      id: 'course-react-ts',
      title: 'React & TypeScript Mastery',
      instructor: 'Marcus Rivera',
      difficulty: 'Intermediate',
      duration: 'Completed',
      image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=240&h=160&fit=crop&auto=format',
    },
  })

  const c4 = await prisma.course.create({
    data: {
      id: 'course-aws',
      title: 'AWS Solutions Architect',
      instructor: 'Elena Volkov',
      difficulty: 'Advanced',
      duration: '14 hrs remaining',
      image: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=240&h=160&fit=crop&auto=format',
    },
  })

  // Enrollments
  await prisma.courseEnrollment.createMany({
    data: [
      { userId: alex.id, courseId: c1.id, enrolledAt: new Date('2025-03-12') },
      { userId: alex.id, courseId: c2.id, enrolledAt: new Date('2025-04-05') },
      { userId: alex.id, courseId: c3.id, enrolledAt: new Date('2025-01-08') },
      { userId: alex.id, courseId: c4.id, enrolledAt: new Date('2025-07-20') },
    ],
  })

  // Course 1 Modules & Lessons
  const c1m1 = await prisma.courseModule.create({
    data: { courseId: c1.id, title: 'Java Fundamentals Review', order: 1 },
  })
  const c1m2 = await prisma.courseModule.create({
    data: { courseId: c1.id, title: 'Spring Boot Essentials', order: 2 },
  })
  const c1m3 = await prisma.courseModule.create({
    data: { courseId: c1.id, title: 'Microservices Architecture', order: 3 },
  })

  const l1_1 = await prisma.lesson.create({
    data: { moduleId: c1m1.id, title: 'OOP Principles', duration: '12 min', order: 1 },
  })
  const l1_2 = await prisma.lesson.create({
    data: { moduleId: c1m1.id, title: 'Generics & Collections', duration: '18 min', order: 2 },
  })

  const l1_3 = await prisma.lesson.create({
    data: { moduleId: c1m2.id, title: 'Dependency Injection', duration: '15 min', order: 1 },
  })
  const l1_4 = await prisma.lesson.create({
    data: { moduleId: c1m2.id, title: 'REST Controllers', duration: '22 min', order: 2 },
  })
  const l1_5 = await prisma.lesson.create({
    data: { moduleId: c1m2.id, title: 'Spring Data JPA', duration: '25 min', order: 3 },
  })
  const l1_6 = await prisma.lesson.create({
    data: { moduleId: c1m2.id, title: 'Security Basics', duration: '20 min', order: 4 },
  })

  const l1_7 = await prisma.lesson.create({
    data: { moduleId: c1m3.id, title: 'Service Discovery', duration: '18 min', order: 1 },
  })
  const l1_8 = await prisma.lesson.create({
    data: { moduleId: c1m3.id, title: 'API Gateway Patterns', duration: '24 min', order: 2 },
  })
  const l1_9 = await prisma.lesson.create({
    data: { moduleId: c1m3.id, title: 'Event-Driven Architecture', duration: '30 min', order: 3 },
  })

  // Lesson Progress for Course 1
  await prisma.lessonProgress.createMany({
    data: [
      { userId: alex.id, lessonId: l1_1.id, completed: true },
      { userId: alex.id, lessonId: l1_2.id, completed: true },
      { userId: alex.id, lessonId: l1_3.id, completed: true },
      { userId: alex.id, lessonId: l1_4.id, completed: true },
      { userId: alex.id, lessonId: l1_5.id, completed: false }, // current
      { userId: alex.id, lessonId: l1_6.id, completed: false },
      { userId: alex.id, lessonId: l1_7.id, completed: false },
      { userId: alex.id, lessonId: l1_8.id, completed: false },
      { userId: alex.id, lessonId: l1_9.id, completed: false },
    ],
  })

  // Course 2 Modules & Lessons
  const c2m1 = await prisma.courseModule.create({
    data: { courseId: c2.id, title: 'Intro to System Design', order: 1 },
  })
  const c2m2 = await prisma.courseModule.create({
    data: { courseId: c2.id, title: 'Database Design', order: 2 },
  })

  const l2_1 = await prisma.lesson.create({
    data: { moduleId: c2m1.id, title: 'Vertical vs Horizontal Scaling', duration: '14 min', order: 1 },
  })
  const l2_2 = await prisma.lesson.create({
    data: { moduleId: c2m1.id, title: 'Load Balancers & Proxy Servers', duration: '18 min', order: 2 },
  })
  const l2_3 = await prisma.lesson.create({
    data: { moduleId: c2m2.id, title: 'SQL vs NoSQL DBs', duration: '25 min', order: 1 },
  })

  await prisma.lessonProgress.createMany({
    data: [
      { userId: alex.id, lessonId: l2_1.id, completed: true },
      { userId: alex.id, lessonId: l2_2.id, completed: true },
      { userId: alex.id, lessonId: l2_3.id, completed: false },
    ],
  })

  // Assessments & Quizzes
  const a1 = await prisma.assessment.create({
    data: {
      id: 'quiz-microservices',
      name: 'Microservices Architecture Quiz',
      courseId: c1.id,
      type: 'Quiz',
      duration: '30 min',
      passing: '75%',
      due: 'Aug 16, 11:59 PM',
      status: 'available',
    },
  })

  const a2 = await prisma.assessment.create({
    data: {
      id: 'quiz-rest-api',
      name: 'REST API Design Assessment',
      courseId: c1.id,
      type: 'Assessment',
      duration: '45 min',
      passing: '80%',
      due: 'Aug 19, 10:00 AM',
      status: 'available',
    },
  })

  const a3 = await prisma.assessment.create({
    data: {
      id: 'exam-sysdesign-midterm',
      name: 'System Design Midterm',
      courseId: c2.id,
      type: 'Exam',
      duration: '90 min',
      passing: '70%',
      due: 'Aug 24, 5:00 PM',
      status: 'upcoming',
    },
  })

  const a4 = await prisma.assessment.create({
    data: {
      id: 'exam-java-final',
      name: 'Java Fundamentals Final',
      courseId: c1.id,
      type: 'Exam',
      duration: '60 min',
      passing: '75%',
      due: 'Jul 10',
      status: 'completed',
    },
  })

  const a5 = await prisma.assessment.create({
    data: {
      id: 'quiz-springboot-practical',
      name: 'Spring Boot Practical',
      courseId: c1.id,
      type: 'Assessment',
      duration: '40 min',
      passing: '75%',
      due: 'Jun 22',
      status: 'completed',
    },
  })

  // Seed Quiz Questions for Microservices Architecture Quiz
  await prisma.question.createMany({
    data: [
      {
        assessmentId: a1.id,
        text: 'Which annotation in Spring Boot is used to mark a class as a REST controller?',
        options: JSON.stringify(['@Controller', '@RestController', '@Service', '@Component']),
        correctIndex: 1,
        explanation: '@RestController is a convenience annotation combining @Controller and @ResponseBody, making every method return data directly to the response body as JSON.',
      },
      {
        assessmentId: a1.id,
        text: 'In Spring Data JPA, what does the findBy prefix in method names signify?',
        options: JSON.stringify(['It marks a repository method', 'It generates a SELECT query based on the field name following it', 'It finds a bean in the context', 'It performs a delete operation']),
        correctIndex: 1,
        explanation: 'Spring Data JPA parses method names to generate queries. findByEmail() generates SELECT ... WHERE email = ?.',
      },
      {
        assessmentId: a1.id,
        text: 'What is the primary purpose of @Transactional in Spring?',
        options: JSON.stringify(['To define HTTP endpoints', 'To inject dependencies', 'To manage database transaction boundaries', 'To cache method results']),
        correctIndex: 2,
        explanation: '@Transactional ensures that a method runs within a database transaction, providing atomicity, consistency, isolation, and durability (ACID) properties.',
      },
      {
        assessmentId: a1.id,
        text: 'Which HTTP status code indicates a successful resource creation in REST APIs?',
        options: JSON.stringify(['200 OK', '201 Created', '204 No Content', '202 Accepted']),
        correctIndex: 1,
        explanation: '201 Created is the correct response for successful POST requests that create a new resource. The Location header should point to the new resource.',
      },
      {
        assessmentId: a1.id,
        text: 'In microservices, what is the role of an API Gateway?',
        options: JSON.stringify([
          'Directly connecting services to the database',
          'Acting as a single entry point for clients, handling routing, auth, and rate limiting',
          'Managing the service registry',
          'Replicating data across services',
        ]),
        correctIndex: 1,
        explanation: 'An API Gateway is the single entry point for all client requests. It handles cross-cutting concerns like authentication, rate limiting, and request routing.',
      },
    ],
  })

  // Quiz Attempts (Completed ones)
  await prisma.quizAttempt.createMany({
    data: [
      { userId: alex.id, assessmentId: a4.id, score: 94, passed: true, answers: '{}' },
      { userId: alex.id, assessmentId: a5.id, score: 88, passed: true, answers: '{}' },
    ],
  })

  // Discussions
  const t1 = await prisma.discussionThread.create({
    data: {
      id: 'thread-1',
      title: 'Best practices for service-to-service auth in microservices?',
      pinned: true,
      courseId: c1.id,
      userId: alex.id, // Just simple seed
      tags: 'microservices,security',
      views: 148,
    },
  })

  const t2 = await prisma.discussionThread.create({
    data: {
      id: 'thread-2',
      title: 'Confused about the difference between @Service and @Component',
      pinned: false,
      courseId: c1.id,
      userId: alex.id,
      tags: 'spring,annotations',
      views: 92,
    },
  })

  const t3 = await prisma.discussionThread.create({
    data: {
      id: 'thread-3',
      title: 'How do I handle circuit breakers with Resilience4j?',
      pinned: false,
      courseId: c1.id,
      userId: alex.id,
      tags: 'resilience,patterns',
      views: 67,
    },
  })

  const t4 = await prisma.discussionThread.create({
    data: {
      id: 'thread-4',
      title: 'Live session recording for Docker Networking available?',
      pinned: false,
      courseId: c2.id,
      userId: alex.id,
      tags: 'docker,networking',
      views: 41,
    },
  })

  // Replies for Thread 1
  await prisma.discussionReply.createMany({
    data: [
      {
        threadId: t1.id,
        userId: alex.id,
        text: 'Great question! For service-to-service auth in microservices, the most common approaches are: 1) JWT tokens passed via HTTP headers, 2) OAuth2 client credentials flow, and 3) mTLS for internal services. For Spring Boot, I recommend using Spring Security with JWT for most cases.',
        isInstructor: true,
      },
      {
        threadId: t1.id,
        userId: alex.id,
        text: 'Thanks! Do you have a recommendation for when to use mTLS vs JWT?',
        isInstructor: false,
      },
    ],
  })

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alex.id,
        type: 'achievement',
        title: 'New Achievement unlocked! 🏆',
        message: "You've earned the '10-Day Streak' badge. Keep up the consistent learning!",
        read: false,
      },
      {
        userId: alex.id,
        type: 'alert',
        title: 'Assessment Deadline',
        message: 'Microservices Architecture Quiz is due tomorrow at 11:59 PM.',
        read: false,
      },
      {
        userId: alex.id,
        type: 'message',
        title: 'Reply in Discussion',
        message: "Sarah Wilson (Instructor) replied to your question in 'REST API Design'.",
        read: true,
      },
    ],
  })

  // Certificates
  await prisma.certificate.create({
    data: {
      userId: alex.id,
      courseTitle: 'React & TypeScript Mastery',
      issuedAt: new Date('2025-01-20'),
      credentialId: 'CERT-RTSM-8910',
    },
  })

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
