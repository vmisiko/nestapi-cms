import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard';
import { UserRole } from '../../../users/domain/user';

function makeContext(role: UserRole | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows the request when the route has no @Roles metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(makeContext(UserRole.STAFF))).toBe(true);
  });

  it('allows the request when the user has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
    ]);

    expect(guard.canActivate(makeContext(UserRole.ADMIN))).toBe(true);
  });

  it('denies the request when the user has none of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
    ]);

    expect(guard.canActivate(makeContext(UserRole.STAFF))).toBe(false);
  });

  it('denies the request when there is no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });
});
