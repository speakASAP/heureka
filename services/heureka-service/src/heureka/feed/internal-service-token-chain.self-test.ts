/**
 * Auth RS256 regression guard for Heureka inbound S2S routes.
 *
 * Static HEUREKA_INTERNAL_SERVICE_TOKEN / INTERNAL_SERVICE_TOKEN /
 * x-internal-service-token / x-service-name paths must stay deleted.
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
    `${short}: does not accept HEUREKA_INTERNAL_SERVICE_TOKEN`,
    !/process\.env\.HEUREKA_INTERNAL_SERVICE_TOKEN/.test(source),
  );
  check(
    `${short}: does not accept INTERNAL_SERVICE_TOKEN`,
    !/process\.env\.INTERNAL_SERVICE_TOKEN/.test(source),
  );
  check(
    `${short}: does not compare static tokens`,
    !/timingSafeEqual/.test(source),
  );
  check(
    `${short}: validates via Auth /auth/validate`,
    /\/auth\/validate/.test(source),
  );
  check(
    `${short}: requires Authorization Bearer`,
    /Missing bearer token/.test(source) && /authorization/.test(source),
  );
  check(
    `${short}: enforces internal:heureka-service role`,
    /internal:heureka-service:/.test(source),
  );
}

if (failures > 0) {
  console.error(`\ninternal-service-token-chain.self-test: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\ninternal-service-token-chain.self-test: all checks passed');
