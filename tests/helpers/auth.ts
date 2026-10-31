import { signJwt } from '@keystay/utils';

export const TEST_JWT_SECRET = 'keystay-super-secret-test-jwt-key-2026-minimum-32-chars';

export async function createTestToken(payload: {
  sub: string;
  email: string;
  role: 'admin' | 'manager' | 'front_desk' | 'housekeeping';
  jti?: string;
}, expiresIn = 3600): Promise<string> {
  return await signJwt(payload, TEST_JWT_SECRET, expiresIn);
}

