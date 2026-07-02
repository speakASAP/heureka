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

  const landingPage = String(controller.landing());
  assertIncludes(landingPage, 'Prodávejte vlastní, Alfares i sdílené produkty na Heurece', 'landing sales proposition headline');
  assertIncludes(landingPage, 'zlevněné produkty od Alfares', 'landing Alfares supplier discount proposition');
  assertIncludes(landingPage, 'resellujte dostupné produkty dalších uživatelů', 'landing shared catalog resale proposition');

  const productsPage = String(controller.dashboardProducts());
  assertIncludes(productsPage, "searchInput.addEventListener('keydown'", 'product search enter binding');
  assertIncludes(productsPage, "event.key === 'Enter'", 'product search enter handling');
  assertIncludes(productsPage, "searchInput.addEventListener('input', scheduleDashboardSearch)", 'product search input debounce binding');
  assertIncludes(productsPage, "params.set('search', search.value.trim())", 'product search query parameter');
  assertIncludes(productsPage, "window.fetch('/api/catalog/access/provision'", 'catalog access provisioning endpoint');
  assertIncludes(productsPage, "body: JSON.stringify({ sourceApplication: AUTH_CLIENT_ID })", 'catalog provisioning source application');
  assertIncludes(productsPage, "Připravujeme váš katalogový prostor.", 'catalog provisioning callback status');

  const adminPage = String(controller.dashboardAdminUsers());
  assertIncludes(adminPage, 'orderLifecycleStats', 'admin central order lifecycle stats rendering');
  assertIncludes(adminPage, 'Warehouse reserved', 'admin delivery reservation metric');
  assertIncludes(adminPage, 'Delivery unknown', 'admin delivery unknown metric');

  console.log('PASS public-dashboard-routes self-test');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
