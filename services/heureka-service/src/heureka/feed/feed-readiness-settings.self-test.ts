import { FeedService } from "./feed.service";

function assertEqual(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertIncludes(values: readonly string[], expected: string): void {
  if (!values.includes(expected)) {
    throw new Error(`Expected ${expected} in ${values.join(",")}`);
  }
}

async function main(): Promise<void> {
  const warnings: string[] = [];
  const missingSettingsTable = new Error("The table public.heureka_settings does not exist in the current database.") as any;
  missingSettingsTable.code = "P2021";
  missingSettingsTable.meta = { table: "public.heureka_settings" };

  const prisma = {
    heurekaSettings: {
      findUnique: async () => {
        throw missingSettingsTable;
      },
    },
  };

  const catalogClient = {
    getProductById: async () => ({
      id: "synthetic-product-1",
      title: "Synthetic Trail Shoe",
      description: "Synthetic public description.",
      status: "active",
      categoryText: "Sport | Running shoes",
    }),
    getProductPricing: async () => ({ priceVat: "1299.00" }),
    getProductMedia: async () => ([{ url: "https://example.test/images/synthetic-trail-shoe.jpg", isPrimary: true }]),
  };

  const warehouseClient = {
    getTotalAvailable: async () => 60,
  };

  const logger = {
    setContext: () => undefined,
    log: () => undefined,
    warn: (message: string) => warnings.push(message),
    error: () => undefined,
  };

  const service = new FeedService(prisma as any, catalogClient as any, warehouseClient as any, logger as any);
  const snapshot = await (service as any).buildReadinessSnapshot("synthetic-product-1", "heureka_cz");
  assertEqual(snapshot.availableStock, 60);
  assertEqual(snapshot.settingsActive, false);
  assertEqual(snapshot.productFound, true);
  assertEqual(warnings.length, 1);

  const response = await service.getProductFeedReadiness("synthetic-product-1", "heureka_cz");
  assertEqual(response.summary.total, 1);
  assertEqual(response.summary.blocked, 1);
  const blockerCodes = response.items[0].blockers.map((blocker) => blocker.code);
  assertIncludes(blockerCodes, "SETTINGS_INACTIVE");
  if (blockerCodes.includes("STOCK_UNKNOWN") || blockerCodes.includes("ZERO_STOCK")) {
    throw new Error(`Expected stock to remain known and positive, received blockers ${blockerCodes.join(",")}`);
  }

  console.log("PASS feed-readiness-settings self-test");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
