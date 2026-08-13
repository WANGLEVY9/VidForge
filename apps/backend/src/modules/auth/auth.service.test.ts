import { strict as assert } from 'node:assert';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { test } from 'node:test';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

function createAuthService() {
  const users: Array<Record<string, unknown>> = [];
  const repo = {
    findOne: async ({ where }: { where: { email?: string; id?: string } }) =>
      users.find((user) => (where.email ? user.email === where.email : user.id === where.id)) ??
      null,
    create: (value: Record<string, unknown>) => ({
      id: `user-${users.length + 1}`,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      isActive: true,
      ...value,
    }),
    save: async (user: Record<string, unknown>) => {
      users.push(user);
      return user;
    },
    createQueryBuilder: () => ({
      addSelect: () => ({
        where: (_condition: string, params: { email?: string; id?: string }) => ({
          getOne: async () =>
            users.find((user) =>
              params.email ? user.email === params.email : user.id === params.id
            ) ?? null,
        }),
      }),
    }),
  };
  const jwt = { sign: (payload: Record<string, unknown>) => JSON.stringify(payload) } as JwtService;
  return { service: new AuthService(repo as never, jwt), users };
}

test('auth registration normalizes email and returns no password hash', async () => {
  const { service, users } = createAuthService();

  const result = await service.register({
    email: '  USER@example.com ',
    username: '用户',
    password: 'secret123',
  });

  assert.equal(result.user.email, 'user@example.com');
  assert.equal(result.user.username, '用户');
  assert.equal(result.user.role, 'user');
  assert.equal('passwordHash' in result.user, false);
  assert.equal(await bcrypt.compare('secret123', String(users[0].passwordHash)), true);
});

test('auth registration rejects duplicate email and login rejects bad credentials', async () => {
  const { service } = createAuthService();
  await service.register({ email: 'user@example.com', username: '用户', password: 'secret123' });

  await assert.rejects(
    () =>
      service.register({
        email: 'USER@example.com',
        username: '另一个用户',
        password: 'secret123',
      }),
    ConflictException
  );
  await assert.rejects(
    () => service.login({ email: 'user@example.com', password: 'wrong123' }),
    UnauthorizedException
  );
});

test('auth login rejects inactive users even with a valid password', async () => {
  const { service, users } = createAuthService();
  await service.register({ email: 'user@example.com', username: '用户', password: 'secret123' });
  users[0].isActive = false;

  await assert.rejects(
    () => service.login({ email: 'user@example.com', password: 'secret123' }),
    UnauthorizedException
  );
});
