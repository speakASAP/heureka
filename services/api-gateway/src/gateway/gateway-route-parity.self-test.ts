import { GatewayController } from './gateway.controller';
import { isHeurekaServiceBackendPath, redactGatewayLogText, summarizeGatewayLogPayload } from './gateway.service';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

async function main(): Promise<void> {
  const heurekaPaths = [
    '/heureka/feed',
    '/heureka/feed?type=heureka_cz',
    '/heureka/feed/readiness/bulk',
    '/heureka/dashboard/me',
    '/heureka/dashboard/catalog-products',
    '/heureka/dashboard/products/product-1/listing',
    '/heureka/products/product-1/status',
    '/heureka/orders',
    '/heureka/orders/order-1',
    '/heureka/orders/ingest',
    '/heureka/health',
  ];

  const legacyAukroFallbackPaths = [
    '/heureka/oauth/callback',
    '/heureka/offers',
    '/heureka/import/sales-center',
    '/aukro/dashboard',
    '',
  ];

  for (const path of heurekaPaths) {
    assertEqual(isHeurekaServiceBackendPath(path), true, path);
  }
  for (const path of legacyAukroFallbackPaths) {
    assertEqual(isHeurekaServiceBackendPath(path), false, path || '<empty>');
  }

  let capturedStatus = 0;
  let capturedBody: any = null;
  const controller = new GatewayController(
    {
      isServiceConfigured: () => false,
      forwardRequest: async () => ({
        _isGatewayResponse: true,
        _gatewayStatus: 409,
        data: { success: false, error: { code: 'CONFLICT' } },
      }),
    } as any,
    {
      setContext: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    } as any,
    {
      getDependencyHealthStatus: async () => ({
        contractVersion: 'heureka.dependency-health.v1',
        status: 'ok',
        service: 'api-gateway',
        readOnly: true,
        mutations: [],
        dependencies: {},
      }),
    } as any,
  );
  await (controller as any).routeRequest(
    'auth',
    '/auth/register',
    {
      method: 'POST',
      body: { email: 'redacted@example.test', password: 'secret' },
      headers: { 'content-type': 'application/json' },
      originalUrl: '/api/auth/register',
      url: '/api/auth/register',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: () => 'self-test',
    },
    {
      status: (status: number) => {
        capturedStatus = status;
        return {
          json: (body: any) => {
            capturedBody = body;
            return undefined;
          },
        };
      },
    },
  );
  assertEqual(capturedStatus, 409, 'forwarded status');
  assertEqual(capturedBody?.error?.code, 'CONFLICT', 'forwarded body');

  const redactedText = redactGatewayLogText('password=secret token=abc123 Authorization: Bearer raw-token-value');
  if (redactedText.includes('secret') || redactedText.includes('abc123') || redactedText.includes('raw-token-value')) {
    throw new Error(`gateway log text redaction leaked sensitive values: ${redactedText}`);
  }
  const payloadSummary = summarizeGatewayLogPayload({
    message: 'failed',
    password: 'secret',
    token: 'abc123',
  });
  const serializedPayloadSummary = JSON.stringify(payloadSummary);
  if (serializedPayloadSummary.includes('secret') || serializedPayloadSummary.includes('abc123')) {
    throw new Error(`gateway log payload summary leaked sensitive values: ${serializedPayloadSummary}`);
  }

  let optionalForwardCalls = 0;
  capturedStatus = 0;
  capturedBody = null;
  const optionalController = new GatewayController(
    {
      isServiceConfigured: () => false,
      forwardRequest: async () => {
        optionalForwardCalls += 1;
        throw new Error('Optional service routes must fail closed before proxying.');
      },
    } as any,
    {
      setContext: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    } as any,
    {
      getDependencyHealthStatus: async () => ({
        contractVersion: 'heureka.dependency-health.v1',
        status: 'ok',
        service: 'api-gateway',
        readOnly: true,
        mutations: [],
        dependencies: {},
      }),
    } as any,
  );
  await (optionalController as any).routeOptionalServiceRequest(
    'settings',
    'SETTINGS_SERVICE_URL or HEUREKA_SETTINGS_SERVICE_PORT',
    '/settings',
    {
      method: 'GET',
      originalUrl: '/api/settings',
      url: '/api/settings',
    },
    {
      status: (status: number) => {
        capturedStatus = status;
        return {
          json: (body: any) => {
            capturedBody = body;
            return undefined;
          },
        };
      },
    },
  );
  assertEqual(optionalForwardCalls, 0, 'optional route proxy calls');
  assertEqual(capturedStatus, 501, 'optional route status');
  assertEqual(capturedBody?.readOnly, true, 'optional route readOnly');
  assertEqual(capturedBody?.error?.code, 'SERVICE_NOT_CONFIGURED', 'optional route code');
  assertEqual(capturedBody?.error?.serviceName, 'settings', 'optional route serviceName');

  console.log('PASS gateway-route-parity self-test');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
