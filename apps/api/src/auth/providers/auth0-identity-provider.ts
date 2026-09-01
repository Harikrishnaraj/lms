import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IdentityProviderPort,
  SignupResult,
  TokenSet,
} from '../ports/identity-provider.port';

interface Auth0TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface Auth0ErrorResponse {
  error?: string;
  error_description?: string;
  code?: string;
  description?: string;
  message?: string;
}

/**
 * Talks to Auth0's Authentication API (and, for verification-email resend, the
 * Management API). Auth0 is the source of truth for credentials, password
 * hashing, and email delivery — this class only translates our domain calls into
 * Auth0's HTTP contract and Auth0's errors into Nest exceptions. No password or
 * verification-token logic lives here or anywhere else in this codebase.
 */
@Injectable()
export class Auth0IdentityProvider implements IdentityProviderPort {
  private readonly logger = new Logger(Auth0IdentityProvider.name);
  private readonly domain: string;
  private readonly audience: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly connection: string;

  private managementToken: { token: string; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {
    this.domain = this.require('AUTH0_DOMAIN');
    this.audience = this.require('AUTH0_AUDIENCE');
    this.clientId = this.require('AUTH0_CLIENT_ID');
    this.clientSecret = this.require('AUTH0_CLIENT_SECRET');
    this.connection = this.configService.get<string>('AUTH0_CONNECTION') ?? 'Username-Password-Authentication';
  }

  async login(email: string, password: string): Promise<TokenSet> {
    const response = await this.postJson('/oauth/token', {
      grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
      realm: this.connection,
      username: email,
      password,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      audience: this.audience,
      scope: 'openid profile email offline_access',
    });

    if (!response.ok) {
      await this.handleAuthError(response, 'Invalid email or password');
    }

    return this.toTokenSet((await response.json()) as Auth0TokenResponse);
  }

  async signup(email: string, password: string, name: string): Promise<SignupResult> {
    const response = await this.postJson('/dbconnections/signup', {
      client_id: this.clientId,
      email,
      password,
      name,
      connection: this.connection,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as Auth0ErrorResponse;
      if (body.code === 'user_exists') {
        throw new ConflictException('An account with this email already exists');
      }
      this.logger.error(`Auth0 signup failed: ${JSON.stringify(body)}`);
      throw new BadGatewayException('Signup failed');
    }

    const body = (await response.json()) as { _id?: string; user_id?: string };
    return { providerUserId: body.user_id ?? body._id ?? '' };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const response = await this.postJson('/dbconnections/change_password', {
      client_id: this.clientId,
      email,
      connection: this.connection,
    });

    if (!response.ok) {
      this.logger.error(`Auth0 password reset request failed for ${email}`);
      throw new BadGatewayException('Unable to start password reset');
    }
  }

  async resendVerificationEmail(providerUserId: string): Promise<void> {
    const managementToken = await this.getManagementToken();

    const response = await fetch(`https://${this.domain}/api/v2/jobs/verification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managementToken}`,
      },
      body: JSON.stringify({ user_id: providerUserId, client_id: this.clientId }),
    });

    if (!response.ok) {
      this.logger.error(`Auth0 resend-verification failed for ${providerUserId}`);
      throw new BadGatewayException('Unable to resend verification email');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    const response = await this.postJson('/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    if (!response.ok) {
      await this.handleAuthError(response, 'Session expired, please log in again');
    }

    const body = (await response.json()) as Auth0TokenResponse;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? refreshToken,
      expiresIn: body.expires_in,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const response = await this.postJson('/oauth/revoke', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      token: refreshToken,
    });

    if (!response.ok) {
      // Best-effort: local session is deleted regardless (see RedisSessionStore usage
      // in AuthService.logout). Auth0 refresh tokens also expire on their own.
      this.logger.warn('Auth0 refresh token revocation failed; local session was still cleared');
    }
  }

  private toTokenSet(body: Auth0TokenResponse): TokenSet {
    if (!body.refresh_token) {
      throw new BadGatewayException(
        'Identity provider did not return a refresh token (check that offline_access is enabled)',
      );
    }
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresIn: body.expires_in,
    };
  }

  private async handleAuthError(response: Response, unauthorizedMessage: string): Promise<never> {
    const body = (await response.json().catch(() => ({}))) as Auth0ErrorResponse;
    if (response.status === 401 || response.status === 403 || body.error === 'invalid_grant') {
      // The client-facing message stays deliberately generic here — it is the
      // user-enumeration guard, and must read identically whether or not the
      // account exists. That also makes a genuinely wrong password
      // indistinguishable from a misconfigured tenant, so log the provider's
      // own error code: without it, `invalid_grant` (wrong password),
      // `unauthorized_client` (Password grant not enabled),
      // `access_denied` (the AUTH0_AUDIENCE API does not exist) and
      // `invalid_client` (wrong client secret) all surface as a bare 401.
      // warn, not error: a wrong password is ordinary traffic, not a fault.
      this.logger.warn(
        `Auth0 rejected credentials: HTTP ${response.status} ${body.error ?? 'unknown_error'}` +
          (body.error_description ? ` — ${body.error_description}` : ''),
      );
      throw new UnauthorizedException(unauthorizedMessage);
    }
    this.logger.error(`Auth0 request failed: ${response.status} ${JSON.stringify(body)}`);
    throw new BadGatewayException('Identity provider request failed');
  }

  private async getManagementToken(): Promise<string> {
    const mgmtClientId = this.configService.get<string>('AUTH0_MGMT_CLIENT_ID');
    const mgmtClientSecret = this.configService.get<string>('AUTH0_MGMT_CLIENT_SECRET');
    if (!mgmtClientId || !mgmtClientSecret) {
      throw new ServiceUnavailableException(
        'Resending verification emails requires AUTH0_MGMT_CLIENT_ID/AUTH0_MGMT_CLIENT_SECRET to be configured',
      );
    }

    const now = Date.now();
    if (this.managementToken && this.managementToken.expiresAt > now + 5000) {
      return this.managementToken.token;
    }

    const response = await this.postJson('/oauth/token', {
      grant_type: 'client_credentials',
      client_id: mgmtClientId,
      client_secret: mgmtClientSecret,
      audience: `https://${this.domain}/api/v2/`,
    });

    if (!response.ok) {
      throw new BadGatewayException('Unable to obtain a Management API token');
    }

    const body = (await response.json()) as Auth0TokenResponse;
    this.managementToken = { token: body.access_token, expiresAt: now + body.expires_in * 1000 };
    return body.access_token;
  }

  private postJson(path: string, payload: Record<string, unknown>): Promise<Response> {
    return fetch(`https://${this.domain}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private require(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required auth configuration: ${key}`);
    }
    return value;
  }
}
