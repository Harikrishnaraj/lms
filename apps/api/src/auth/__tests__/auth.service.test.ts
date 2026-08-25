import { SignJWT, generateKeyPair } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { IdentityProviderPort, TokenSet } from '../ports/identity-provider.port';
import { SessionRecord, SessionStorePort } from '../ports/session-store.port';

function fakeConfigService(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    REFRESH_SESSION_COOKIE_NAME: 'lms_sid',
    REFRESH_SESSION_TTL_SECONDS: 604_800,
    AUTH_CLAIMS_NAMESPACE: 'https://lms.app/',
    NODE_ENV: 'test',
    ...overrides,
  };
  return { get: (key: string) => defaults[key] };
}

function fakeResponse() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

async function signAccessToken(sub: string, orgId?: string): Promise<string> {
  const { privateKey } = await generateKeyPair('RS256');
  const claims: Record<string, unknown> = { sub };
  if (orgId) claims['https://lms.app/org_id'] = orgId;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey);
}

class InMemorySessionStore implements SessionStorePort {
  private records = new Map<string, SessionRecord>();

  async create(sessionId: string, record: SessionRecord): Promise<void> {
    this.records.set(sessionId, record);
  }
  async get(sessionId: string): Promise<SessionRecord | null> {
    return this.records.get(sessionId) ?? null;
  }
  async delete(sessionId: string): Promise<void> {
    this.records.delete(sessionId);
  }
  size(): number {
    return this.records.size;
  }
}

describe('AuthService session management', () => {
  let identityProvider: IdentityProviderPort;
  let sessionStore: InMemorySessionStore;
  let service: AuthService;

  beforeEach(() => {
    identityProvider = {
      login: vi.fn(),
      signup: vi.fn(),
      requestPasswordReset: vi.fn(),
      resendVerificationEmail: vi.fn(),
      refreshAccessToken: vi.fn(),
      revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
    };
    sessionStore = new InMemorySessionStore();
    service = new AuthService(identityProvider, sessionStore, fakeConfigService() as never);
  });

  it('login creates a session and sets an HttpOnly cookie, never exposing the provider refresh token', async () => {
    const accessToken = await signAccessToken('auth0|123', 'org-1');
    const tokenSet: TokenSet = { accessToken, refreshToken: 'auth0-refresh-token', expiresIn: 900 };
    (identityProvider.login as ReturnType<typeof vi.fn>).mockResolvedValue(tokenSet);
    const res = fakeResponse();

    const result = await service.login('user@example.com', 'password', res as never);

    expect(result.accessToken).toBe(accessToken);
    expect(sessionStore.size()).toBe(1);
    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [cookieName, cookieValue, cookieOptions] = res.cookie.mock.calls[0];
    expect(cookieName).toBe('lms_sid');
    expect(cookieValue).not.toBe('auth0-refresh-token'); // opaque session id, not the real token
    expect(cookieOptions).toMatchObject({ httpOnly: true, sameSite: 'strict' });
  });

  it('refresh rejects when there is no session cookie', async () => {
    const res = fakeResponse();
    await expect(service.refresh(undefined, res as never)).rejects.toThrow('No active session');
  });

  it('refresh rejects when the session was revoked (deleted from the store)', async () => {
    const res = fakeResponse();
    await expect(service.refresh('nonexistent-session-id', res as never)).rejects.toThrow(
      'Session expired or revoked',
    );
  });

  it('refresh exchanges the stored refresh token and rotates the session', async () => {
    const accessToken = await signAccessToken('auth0|123', 'org-1');
    (identityProvider.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken,
      refreshToken: 'refresh-v1',
      expiresIn: 900,
    });
    const loginRes = fakeResponse();
    await service.login('user@example.com', 'password', loginRes as never);
    const sessionId = loginRes.cookie.mock.calls[0][1];

    const newAccessToken = await signAccessToken('auth0|123', 'org-1');
    (identityProvider.refreshAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken: newAccessToken,
      refreshToken: 'refresh-v2',
      expiresIn: 900,
    });

    const refreshRes = fakeResponse();
    const result = await service.refresh(sessionId, refreshRes as never);

    expect(result.accessToken).toBe(newAccessToken);
    expect(identityProvider.refreshAccessToken).toHaveBeenCalledWith('refresh-v1');
    const rotated = await sessionStore.get(sessionId);
    expect(rotated?.refreshToken).toBe('refresh-v2');
  });

  it('logout deletes the session and best-effort revokes the provider refresh token', async () => {
    const accessToken = await signAccessToken('auth0|123');
    (identityProvider.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken,
      refreshToken: 'refresh-v1',
      expiresIn: 900,
    });
    const loginRes = fakeResponse();
    await service.login('user@example.com', 'password', loginRes as never);
    const sessionId = loginRes.cookie.mock.calls[0][1];

    const logoutRes = fakeResponse();
    await service.logout(sessionId, logoutRes as never);

    expect(identityProvider.revokeRefreshToken).toHaveBeenCalledWith('refresh-v1');
    expect(await sessionStore.get(sessionId)).toBeNull();
    expect(logoutRes.clearCookie).toHaveBeenCalledTimes(1);
  });

  it('logout is a no-op (but still clears the cookie) when there is no session', async () => {
    const res = fakeResponse();
    await expect(service.logout(undefined, res as never)).resolves.toEqual({ message: 'Logged out' });
    expect(res.clearCookie).toHaveBeenCalledTimes(1);
    expect(identityProvider.revokeRefreshToken).not.toHaveBeenCalled();
  });
});
