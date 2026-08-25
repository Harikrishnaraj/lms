import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: { email: string; name: string; password?: string }
  ) {
    return this.authService.register(body)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password?: string }
  ) {
    return this.authService.login(body)
  }

  @Post('forgot-password/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendResetOtp(@Body() body: { email: string }) {
    return this.authService.sendResetOtp(body)
  }

  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyResetOtp(@Body() body: { email: string; code: string }) {
    return this.authService.verifyResetOtp(body)
  }

  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { email: string; newPassword: string }) {
    return this.authService.resetPassword(body)
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmail(body)
  }
}
