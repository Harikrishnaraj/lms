export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignupResult {
  providerUserId: string;
}

/**
 * Everything the rest of the app needs from the identity provider, named around
 * our domain (login, signup, password reset) rather than the provider's own API
 * shape. AuthService and AuthController depend only on this — swapping Auth0 for
 * another OIDC provider means writing a new adapter, not touching call sites.
 */
export interface IdentityProviderPort {
  login(email: string, password: string): Promise<TokenSet>;
  signup(email: string, password: string, name: string): Promise<SignupResult>;
  requestPasswordReset(email: string): Promise<void>;
  resendVerificationEmail(providerUserId: string): Promise<void>;
  refreshAccessToken(refreshToken: string): Promise<TokenSet>;
  revokeRefreshToken(refreshToken: string): Promise<void>;
}

export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');
