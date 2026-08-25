export interface SessionRecord {
  refreshToken: string;
  userId: string;
  organizationId: string | null;
  createdAt: string;
}

/**
 * Local, revocable record of a login session, keyed by an opaque session id
 * carried in an HttpOnly cookie — never the identity provider's own refresh
 * token. This lets logout invalidate a session immediately and locally (matching
 * the TRD's "Redis revocation records" requirement) even if the provider-side
 * revoke call is delayed, retried, or fails.
 */
export interface SessionStorePort {
  create(sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void>;
  get(sessionId: string): Promise<SessionRecord | null>;
  delete(sessionId: string): Promise<void>;
}

export const SESSION_STORE = Symbol('SESSION_STORE');
