import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function contextFor(user: { sub: string } | undefined) {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

test('admin guard allows an active admin from the database', async () => {
  const authService = {
    findById: async () => ({ id: 'admin-1', role: 'admin', isActive: true }),
  } as never;
  const guard = new AdminGuard(authService);

  assert.equal(await guard.canActivate(contextFor({ sub: 'admin-1' })), true);
});

test('admin guard rejects a regular user', async () => {
  const authService = {
    findById: async () => ({ id: 'user-1', role: 'user', isActive: true }),
  } as never;
  const guard = new AdminGuard(authService);

  await assert.rejects(
    guard.canActivate(contextFor({ sub: 'user-1' })),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test('admin guard rejects a disabled or missing user even with a stale token', async () => {
  const authService = {
    findById: async (userId: string) =>
      userId === 'disabled-1' ? { id: userId, role: 'admin', isActive: false } : null,
  } as never;
  const guard = new AdminGuard(authService);

  await assert.rejects(guard.canActivate(contextFor({ sub: 'disabled-1' })), ForbiddenException);
  await assert.rejects(guard.canActivate(contextFor({ sub: 'missing-1' })), ForbiddenException);
});
