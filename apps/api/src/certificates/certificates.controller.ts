import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Controller('certificates')
export class CertificatesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getCertificates() {
    const userId = 'alex-johnson-uuid'
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
    })

    return certificates.map((c) => ({
      id: c.id,
      title: c.courseTitle,
      issued: c.issuedAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      credentialId: c.credentialId,
      instructor: 'Dr. James Wilson', // Default
    }))
  }
}
