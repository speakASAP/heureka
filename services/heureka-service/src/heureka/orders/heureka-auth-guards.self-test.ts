/**
 * Auth RS256 behavioral checks for Heureka inbound S2S guards.
 * Static HEUREKA_INTERNAL_SERVICE_TOKEN paths must stay rejected.
 */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { HeurekaOrderIngestionGuard } from './order-ingestion.guard';
import { HeurekaFeedMutationGuard } from '../feed/feed-mutation.guard';

function mockContext(headers: Record<string, string>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as any;
}

let failures = 0;
function check(name: string, ok: boolean): void {
  if (ok) {
    console.log(`  ok   ${name}`);
    return;
  }
  console.error(`  FAIL ${name}`);
  failures += 1;
}

async function expectRejects(promise: Promise<unknown>, ErrorType: new (...args: any[]) => Error): Promise<boolean> {
  try {
    await promise;
    return false;
  } catch (error) {
    return error instanceof ErrorType;
  }
}

async function main(): Promise<void> {
  process.env.AUTH_SERVICE_URL = 'http://auth-service';
  const originalFetch = globalThis.fetch;
  const orderGuard = new HeurekaOrderIngestionGuard();
  const feedGuard = new HeurekaFeedMutationGuard();

  check(
    'order ingest rejects static x-internal-service-token',
    await expectRejects(
      orderGuard.canActivate(mockContext({
        'x-internal-service-token': 'heureka-static',
        'x-service-name': 'heureka-service',
      })),
      UnauthorizedException,
    ),
  );

  globalThis.fetch = (async () => ({ ok: false })) as any;
  check(
    'order ingest rejects static Bearer Auth refuses',
    await expectRejects(
      orderGuard.canActivate(mockContext({ authorization: 'Bearer HEUREKA_INTERNAL_SERVICE_TOKEN_VALUE' })),
      UnauthorizedException,
    ),
  );

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      valid: true,
      user: { id: 'svc-1', roles: ['internal:heureka-service:orders'] },
    }),
  })) as any;
  check(
    'order ingest allows internal:heureka-service:orders',
    (await orderGuard.canActivate(mockContext({ authorization: 'Bearer auth-rs256' }))) === true,
  );

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      valid: true,
      user: { id: 'svc-1', roles: ['internal:heureka-service:feed'] },
    }),
  })) as any;
  check(
    'order ingest rejects wrong role',
    await expectRejects(
      orderGuard.canActivate(mockContext({ authorization: 'Bearer auth-rs256' })),
      ForbiddenException,
    ),
  );

  check(
    'feed mutation rejects static header path',
    await expectRejects(
      feedGuard.canActivate(mockContext({
        'x-internal-service-token': 'static',
        'x-service-name': 'catalog-microservice',
      })),
      UnauthorizedException,
    ),
  );

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      valid: true,
      user: { id: 'svc-catalog--heureka', roles: ['internal:heureka-service:feed'] },
    }),
  })) as any;
  check(
    'feed mutation allows internal:heureka-service:feed',
    (await feedGuard.canActivate(mockContext({ authorization: 'Bearer auth-rs256' }))) === true,
  );

  globalThis.fetch = originalFetch;

  if (failures > 0) {
    console.error(`\nheureka-auth-guards.self-test: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nheureka-auth-guards.self-test: all checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
