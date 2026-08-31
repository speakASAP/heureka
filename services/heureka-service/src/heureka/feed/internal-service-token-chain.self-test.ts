/**
 * Session F regression guard.
 *
 * Both inbound guards (HeurekaFeedMutationGuard, HeurekaOrderIngestionGuard) used to
 * fall through to process.env.JWT_TOKEN, which holds the shared `a2880693` value —
 * one string that was simultaneously the credential for five other services and
 * cannot be revoked per-caller. This asserts that fallback is gone, so a well-meaning
 * "restore the fallback" edit fails loudly instead of silently re-sharing the value.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const GUARDS = [
  join(__dirname, 'feed-mutation.guard.ts'),
  join(__dirname, '..', 'orders', 'order-ingestion.guard.ts'),
];

let failures = 0;
function check(name: string, ok: boolean): void {
  if (ok) {
    console.log(`  ok   ${name}`);
    return;
  }
  console.error(`  FAIL ${name}`);
  failures += 1;
}

for (const file of GUARDS) {
  const source = readFileSync(file, 'utf8');
  const short = file.split('/').slice(-1)[0];

  check(
    `${short}: does not read JWT_TOKEN (the shared a2880693 value)`,
    !/process\.env\.JWT_TOKEN/.test(source),
  );
  check(
    `${short}: still accepts its own HEUREKA_INTERNAL_SERVICE_TOKEN`,
    /process\.env\.HEUREKA_INTERNAL_SERVICE_TOKEN/.test(source),
  );
  check(
    `${short}: still compares in constant time`,
    /timingSafeEqual/.test(source),
  );
}

if (failures > 0) {
  console.error(`\ninternal-service-token-chain.self-test: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\ninternal-service-token-chain.self-test: all checks passed');
