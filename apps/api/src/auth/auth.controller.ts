import { Body, Controller, Post, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './authenticated-user';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Create an account with the identity provider' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.email, dto.password, dto.name);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate and receive an access token' })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto.email, dto.password, res);
  }

  @Public()
  @Post('password/forgot')
  @ApiOperation({ summary: 'Trigger a password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('email/verify/resend')
  @ApiOperation({ summary: 'Resend the email verification link to the current user' })
  resendVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.resendVerificationEmail(user);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Exchange the session cookie for a new access token' })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(this.authService.getSessionId(req), res);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'End the current session' })
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(this.authService.getSessionId(req), res);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retrieve the authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
