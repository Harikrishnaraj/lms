import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exportJWK, generateKeyPair, KeyLike, SignJWT } from 'jose';
import type { PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../../database/database.constants';

const KEY_ID = 'dev-bypass-1';
const TOKEN_TTL = '24h';

export interface DevUser {
  /** Local User.id — what the frontend sends back to select who to sign in as. */
  userId: string;
  organizationId: string;
  organizationName: string;
  name: string;
  email: string;
  role: string | null;
}

/**
 * "Sign in as a seeded demo user" for local manual testing without a live
 * Auth0 tenant — see apps/api/src/auth/README.md ("Local dev without
 * Auth0"). Every method here throws NotFoundException unless
 * DEV_AUTH_BYPASS=true, so this is inert by default and refuses to run at
 * all when NODE_ENV=production (see packages/config/src/env.ts).
 *
 * Mints real RS256-signed access tokens against an in-memory keypair
 * generated once per process, and serves the matching public key as a
 * JWKS document — JwtStrategy verifies these exactly like a real Auth0
 * token, as long as AUTH_JWKS_URI / AUTH_ISSUER are pointed at this
 * module's routes (see .env.example). No session cookie, no Redis, no
 * refresh flow: the frontend dev-login page takes the returned
 * accessToken and calls setAccessToken() directly.
 */
@Injectable()
export class DevAuthService {
  private keyPairPromise: Promise<{ publicKey: KeyLike; privateKey: KeyLike }> | null = null;

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly configService: ConfigService,
  ) {}

  private assertEnabled(): void {
    if (!this.configService.get<boolean>('DEV_AUTH_BYPASS')) {
      // 404, not 403: this endpoint shouldn't even reveal it exists when disabled.
      throw new NotFoundException();
    }
  }

  private getKeyPair(): Promise<{ publicKey: KeyLike; privateKey: KeyLike }> {
    if (!this.keyPairPromise) {
      this.keyPairPromise = generateKeyPair('RS256');
    }
    return this.keyPairPromise;
  }

  async getJwks(): Promise<{ keys: Record<string, unknown>[] }> {
    this.assertEnabled();
    const { publicKey } = await this.getKeyPair();
    const jwk = { ...(await exportJWK(publicKey)), kid: KEY_ID, alg: 'RS256', use: 'sig' };
    return { keys: [jwk] };
  }

  /** Every seeded user with a provisioned externalId, across every organization, for the demo-user picker. */
  async listDemoUsers(): Promise<DevUser[]> {
    this.assertEnabled();

    const users = await this.prisma.user.findMany({
      where: { externalId: { not: null } },
      orderBy: [{ organizationId: 'asc' }, { firstName: 'asc' }],
    });
    if (users.length === 0) return [];

    const [memberships, organizations] = await Promise.all([
      this.prisma.membership.findMany({
        where: { userId: { in: users.map((u) => u.externalId as string) } },
        include: { role: true },
      }),
      this.prisma.organization.findMany({ where: { id: { in: [...new Set(users.map((u) => u.organizationId))] } } }),
    ]);
    const roleByOrgAndExternalId = new Map(memberships.map((m) => [`${m.organizationId}:${m.userId}`, m.role.key]));
    const orgNameById = new Map(organizations.map((o) => [o.id, o.name]));

    return users.map((u) => ({
      userId: u.id,
      organizationId: u.organizationId,
      organizationName: orgNameById.get(u.organizationId) ?? u.organizationId,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: roleByOrgAndExternalId.get(`${u.organizationId}:${u.externalId}`) ?? null,
    }));
  }

  /** Mints a real RS256 access token for the given local User.id, with the org_id custom claim TenantContextInterceptor requires. */
  async signDevToken(userId: string): Promise<{ accessToken: string; user: DevUser }> {
    this.assertEnabled();

    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user || !user.externalId) throw new NotFoundException('User not found');

    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: user.organizationId, userId: user.externalId } },
      include: { role: true },
    });

    const namespace = this.configService.get<string>('AUTH_CLAIMS_NAMESPACE') ?? 'https://lms.app/';
    const audience = this.configService.get<string>('AUTH0_AUDIENCE');
    const issuer = this.configService.get<string>('AUTH_ISSUER');
    if (!issuer) {
      throw new Error('AUTH_ISSUER must be set to this API\'s dev JWKS issuer when DEV_AUTH_BYPASS=true (see .env.example)');
    }

    const { privateKey } = await this.getKeyPair();
    const accessToken = await new SignJWT({
      email: user.email,
      email_verified: true,
      [`${namespace}org_id`]: user.organizationId,
      [`${namespace}role`]: membership?.role.key ?? null,
    })
      .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
      .setSubject(user.externalId)
      .setIssuer(issuer)
      .setAudience(audience ?? '')
      .setIssuedAt()
      .setExpirationTime(TOKEN_TTL)
      .sign(privateKey);

    const organization = await this.prisma.organization.findFirst({ where: { id: user.organizationId } });

    return {
      accessToken,
      user: {
        userId: user.id,
        organizationId: user.organizationId,
        organizationName: organization?.name ?? user.organizationId,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: membership?.role.key ?? null,
      },
    };
  }
}
