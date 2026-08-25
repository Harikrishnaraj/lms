import { createServer, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, KeyLike } from 'jose';

/**
 * A throwaway HTTP server serving a real JWKS document over the exact shape
 * jwks-rsa expects, backed by a freshly generated RSA keypair. Lets tests
 * exercise JwtStrategy's production code path (fetch JWKS, verify RS256
 * signature, check iss/aud/exp) without any dependency on a live Auth0 tenant.
 */
export interface TestJwksServer {
  issuer: string;
  jwksUri: string;
  kid: string;
  privateKey: KeyLike;
  close: () => Promise<void>;
}

export async function startTestJwksServer(): Promise<TestJwksServer> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const kid = 'test-key-1';
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };

  const server: Server = createServer((req, res) => {
    if (req.url === '/.well-known/jwks.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;

  return {
    issuer: `${origin}/`,
    jwksUri: `${origin}/.well-known/jwks.json`,
    kid,
    privateKey,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
