import { randomUUID } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthenticatedUser, decodeJwtPayload } from './authenticated-user';
import { IDENTITY_PROVIDER, IdentityProviderPort } from './ports/identity-provider.port';
import { SESSION_STORE, SessionStorePort } from './ports/session-store.port';

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

@Injectable()
export class AuthService {
  private readonly cookieName: string;
  private readonly sessionTtlSeconds: number;
  private readonly claimsNamespace: string;
  private readonly cookiePath = '/api/v1/auth';

  constructor(
    @Inject(IDENTITY_PROVIDER) private readonly identityProvider: IdentityProviderPort,
    @Inject(SESSION_STORE) private readonly sessionStore: SessionStorePort,
    private readonly configService: ConfigService,
  ) {
    this.cookieName = this.configService.get<string>('REFRESH_SESSION_COOKIE_NAME') ?? 'lms_sid';
    this.sessionTtlSeconds = this.configService.get<number>('REFRESH_SESSION_TTL_SECONDS') ?? 604_800;
    this.claimsNamespace = this.configService.get<string>('AUTH_CLAIMS_NAMESPACE') ?? 'https://lms.app/';
  }

  async login(email: string, password: string, res: Response): Promise<AccessTokenResponse> {
    const tokens = await this.identityProvider.login(email, password);
    const claims = decodeJwtPayload(tokens.accessToken);
    const orgClaim = claims[`${this.claimsNamespace}org_id`];

    const sessionId = randomUUID();
    await this.sessionStore.create(
      sessionId,
      {
        refreshToken: tokens.refreshToken,
        userId: claims.sub,
        organizationId: typeof orgClaim === 'string' ? orgClaim : null,
        createdAt: new Date().toISOString(),
      },
      this.sessionTtlSeconds,
    );

    this.setSessionCookie(res, sessionId);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, tokenType: 'Bearer' };
  }

  async signup(email: string, password: string, name: string) {
    const result = await this.identityProvider.signup(email, password, name);
    return {
      providerUserId: result.providerUserId,
      message: 'Account created. Check your email to verify your address.',
    };
  }

  async requestPasswordReset(email: string) {
    await this.identityProvider.requestPasswordReset(email);
    // Do not reveal whether the email is registered.
    return { message: 'If an account exists for this email, a password reset link has been sent.' };
  }

  async resendVerificationEmail(user: AuthenticatedUser) {
    await this.identityProvider.resendVerificationEmail(user.id);
    return { message: 'Verification email sent.' };
  }

  async refresh(sessionId: string | undefined, res: Response): Promise<AccessTokenResponse> {
    if (!sessionId) {
      throw new UnauthorizedException('No active session');
    }

    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    const tokens = await this.identityProvider.refreshAccessToken(session.refreshToken);
    await this.sessionStore.create(
      sessionId,
      { ...session, refreshToken: tokens.refreshToken },
      this.sessionTtlSeconds,
    );

    this.setSessionCookie(res, sessionId);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, tokenType: 'Bearer' };
  }

  async logout(sessionId: string | undefined, res: Response) {
    if (sessionId) {
      const session = await this.sessionStore.get(sessionId);
      if (session) {
        await this.identityProvider.revokeRefreshToken(session.refreshToken).catch(() => undefined);
        await this.sessionStore.delete(sessionId);
      }
    }
    this.clearSessionCookie(res);
    return { message: 'Logged out' };
  }

  getSessionId(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[this.cookieName];
  }

  private setSessionCookie(res: Response, sessionId: string): void {
    res.cookie(this.cookieName, sessionId, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.sessionTtlSeconds * 1000,
      path: this.cookiePath,
    });
  }

  private clearSessionCookie(res: Response): void {
    res.clearCookie(this.cookieName, { path: this.cookiePath });
  }
}
