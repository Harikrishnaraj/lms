import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Public } from '../decorators/public.decorator';
import { DevAuthService, DevUser } from './dev-auth.service';

class DevLoginDto {
  @IsUUID()
  userId!: string;
}

/**
 * Dev-only "sign in as a seeded demo user" side door. See DevAuthService
 * for the enable/disable guard and apps/api/src/auth/README.md ("Local dev
 * without Auth0") for how to turn this on. Excluded from the Swagger docs
 * on purpose — this is not a real API surface.
 */
@ApiExcludeController()
@Controller('auth/dev')
export class DevAuthController {
  constructor(private readonly devAuthService: DevAuthService) {}

  @Public()
  @Get('jwks')
  getJwks() {
    return this.devAuthService.getJwks();
  }

  @Public()
  @Get('users')
  listUsers(): Promise<DevUser[]> {
    return this.devAuthService.listDemoUsers();
  }

  @Public()
  @Post('login')
  login(@Body() dto: DevLoginDto) {
    return this.devAuthService.signDevToken(dto.userId);
  }
}
