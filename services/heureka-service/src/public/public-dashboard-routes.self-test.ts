import 'reflect-metadata';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PublicController } from './public.controller';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertIncludes(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: expected rendered HTML to include ${expected}`);
  }
}

function routePath(methodName: keyof PublicController): string {
  const handler = PublicController.prototype[methodName] as any;
  return String(Reflect.getMetadata(PATH_METADATA, handler));
}

async function main(): Promise<void> {
  const controller = new PublicController();
  const routes: Array<[keyof PublicController, string]> = [
    ['dashboardProducts', 'dashboard/products'],
    ['dashboardFeed', 'dashboard/feed'],
    ['dashboardOrders', 'dashboard/orders'],
    ['dashboardOperations', 'dashboard/operations'],
    ['dashboardSettings', 'dashboard/settings'],
    ['dashboardAdminUsers', 'dashboard/admin/users'],
  ];

  for (const [methodName, expectedPath] of routes) {
    assertEqual(routePath(methodName), expectedPath, `${String(methodName)} route path`);
    assertIncludes(String((controller[methodName] as any).call(controller)), 'data-page="dashboard"', `${String(methodName)} page`);
  }

  const productsPage = String(controller.dashboardProducts());
  assertIncludes(productsPage, "searchInput.addEventListener('keydown'", 'product search enter binding');
  assertIncludes(productsPage, "event.key === 'Enter'", 'product search enter handling');
  assertIncludes(productsPage, "searchInput.addEventListener('input', scheduleDashboardSearch)", 'product search input debounce binding');
  assertIncludes(productsPage, "params.set('search', search.value.trim())", 'product search query parameter');

  console.log('PASS public-dashboard-routes self-test');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
