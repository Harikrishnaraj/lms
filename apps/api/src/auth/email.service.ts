import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private async initializeTransporter() {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587')
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
      this.logger.log('SMTP Transporter initialized from environment variables.')
    } else {
      this.logger.log('SMTP environment variables missing. Email service will run in Ethereal mock mode.')
    }
  }

  private async sendEmail(to: string, subject: string, html: string) {
    const from = process.env.SMTP_FROM || '"LMS Team" <no-reply@lms.com>'

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to, subject, html })
        this.logger.log(`Email sent to ${to}: ${subject}`)
        return
      } catch (err: any) {
        this.logger.error(`Failed to send email via SMTP: ${err.message}`)
      }
    }

    try {
      this.logger.log('Creating Ethereal Test Account...')
      const testAccount = await nodemailer.createTestAccount()
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      })

      const info = await testTransporter.sendMail({ from, to, subject, html })

      console.log(`\n==================================================`)
      console.log(`[EMAIL] Email sent to ${to}: ${subject}`)
      console.log(`[EMAIL] Preview URL: ${nodemailer.getTestMessageUrl(info)}`)
      console.log(`==================================================\n`)
    } catch (err: any) {
      this.logger.error(`Failed to send Ethereal test email: ${err.message}`)
    }
  }

  async sendVerificationEmail(to: string, code: string) {
    const subject = 'LMS – Verify Your Email Address'
    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px;">
        <h2 style="color: #2563EB; margin-top: 0;">LMS Verification Code</h2>
        <p>Hello,</p>
        <p>Please use the following 6-digit code to verify your email address and sign in:</p>
        <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 15px; border-radius: 6px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0F172A; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #64748B;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `
    await this.sendEmail(to, subject, html)
  }

  async sendPasswordResetEmail(to: string, code: string) {
    const subject = 'LMS – Password Reset Code'
    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px;">
        <h2 style="color: #DC2626; margin-top: 0;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Enter the code below to continue:</p>
        <div style="background: #FEF2F2; border: 1px dashed #FECACA; padding: 15px; border-radius: 6px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0F172A; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #64748B;">This code is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `
    await this.sendEmail(to, subject, html)
  }
}
