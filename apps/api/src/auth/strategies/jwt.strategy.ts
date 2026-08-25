import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtClaims, mapClaimsToAuthenticatedUser } from '../authenticated-user';

/**
 * Verifies access tokens issued by the OIDC identity provider (Auth0). Signature
 * verification is delegated to `jwks-rsa`, which fetches and caches the provider's
 * public signing keys — the API never holds or checks a shared secret for user
 * tokens. `AUTH_JWKS_URI` / `AUTH_ISSUER` let tests point this at a local,
 * ephemeral JWKS server instead of the real provider.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly claimsNamespace: string;

  constructor(configService: ConfigService) {
    const domain = configService.get<string>('AUTH0_DOMAIN');
    const jwksUri = configService.get<string>('AUTH_JWKS_URI') ?? `https://${domain}/.well-known/jwks.json`;
    const issuer = configService.get<string>('AUTH_ISSUER') ?? `https://${domain}/`;
    const audience = configService.get<string>('AUTH0_AUDIENCE');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
      audience,
      issuer,
      algorithms: ['RS256'],
    });

    this.claimsNamespace = configService.get<string>('AUTH_CLAIMS_NAMESPACE') ?? 'https://lms.app/';
  }

  validate(payload: JwtClaims): AuthenticatedUser {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token is missing a subject claim');
    }
    return mapClaimsToAuthenticatedUser(payload, this.claimsNamespace);
  }
}
