import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { EmailService } from './email.service'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  async register(data: { email: string; name: string; password?: string }) {
    const email = data.email.trim().toLowerCase()
    
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new BadRequestException('Email is already registered.')
    }

    const passwordPlain = data.password || 'password123'
    const passwordHash = await bcrypt.hash(passwordPlain, 10)

    // Generate initials for avatar if name is provided, otherwise default to 'U'
    const avatar = data.name ? data.name.trim().charAt(0).toUpperCase() : 'U'

    const user = await this.prisma.user.create({
      data: {
        email,
        name: data.name,
        password: passwordHash,
        avatar,
        role: 'student',
        streakDays: 0,
        overallProgress: 0.0,
        hoursLearned: 0.0,
      },
    })

    // Return user without password
    const { password: _, ...result } = user
    return result
  }

  async login(data: { email: string; password?: string }) {
    const email = data.email.trim().toLowerCase()

    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new NotFoundException('User is not registered. Please register first.')
    }

    const passwordPlain = data.password || ''
    const isPasswordValid = await bcrypt.compare(passwordPlain, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password. Please try again.')
    }

    // Check if email is verified
    if (!user.emailVerified) {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      
      await this.prisma.user.update({
        where: { email },
        data: { verificationCode },
      })

      console.log(`\n==================================================`);
      console.log(`[API] VERIFICATION CODE FOR ${email}: ${verificationCode}`);
      console.log(`==================================================\n`);

      await this.emailService.sendVerificationEmail(email, verificationCode)

      return { requiresVerification: true, email }
    }

    // Return user without password
    const { password: _, verificationCode: __, ...result } = user
    return result
  }

  async verifyEmail(data: { email: string; code: string }) {
    const email = data.email.trim().toLowerCase()
    const code = data.code.trim()

    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    if (!user.verificationCode || user.verificationCode !== code) {
      throw new UnauthorizedException('Invalid verification code.')
    }

    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        verificationCode: null,
      },
    })

    const { password: _, verificationCode: __, ...result } = updatedUser
    return result
  }

  async sendResetOtp(data: { email: string }) {
    const email = data.email.trim().toLowerCase()

    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new NotFoundException('Email address not found. Please register first.')
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Reuse verificationCode field to store the reset OTP
    await this.prisma.user.update({
      where: { email },
      data: { verificationCode: `reset:${otp}` },
    })

    console.log(`\n==================================================`)
    console.log(`[API] PASSWORD RESET OTP FOR ${email}: ${otp}`)
    console.log(`==================================================\n`)

    await this.emailService.sendPasswordResetEmail(email, otp)

    return { status: 'otp_sent', message: 'A reset code has been sent to your email.' }
  }

  async verifyResetOtp(data: { email: string; code: string }) {
    const email = data.email.trim().toLowerCase()
    const code = data.code.trim()

    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    const expectedCode = `reset:${code}`
    if (!user.verificationCode || user.verificationCode !== expectedCode) {
      throw new UnauthorizedException('Invalid or expired reset code.')
    }

    // Mark OTP as verified by updating the code to a verified sentinel
    await this.prisma.user.update({
      where: { email },
      data: { verificationCode: `reset_verified:${code}` },
    })

    return { status: 'otp_verified', message: 'Code verified. You may now reset your password.' }
  }

  async resetPassword(data: { email: string; newPassword: string }) {
    const email = data.email.trim().toLowerCase()

    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    // Ensure OTP was verified first
    if (!user.verificationCode || !user.verificationCode.startsWith('reset_verified:')) {
      throw new UnauthorizedException('Email not verified. Please complete the OTP step first.')
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10)

    await this.prisma.user.update({
      where: { email },
      data: {
        password: passwordHash,
        verificationCode: null,
      },
    })

    return { status: 'success', message: 'Password reset successfully.' }
  }
}
