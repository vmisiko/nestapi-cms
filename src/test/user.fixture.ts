import { User, UserRole } from '../users/domain/user';

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '00000000-0000-4000-8000-000000000001',
  email: 'test@citymega.org',
  passwordHash: '$2a$12$mockhash',
  role: UserRole.STAFF,
  isActive: true,
  refreshTokenHash: null,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});
