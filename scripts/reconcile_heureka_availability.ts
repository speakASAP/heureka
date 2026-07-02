import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { ClientsModule, LoggerModule, PrismaModule } from '../shared';
import { HeurekaAvailabilityReconciliationService } from '../services/heureka-service/src/heureka/feed/feed-availability-reconciliation.service';
import { HeurekaOperationsModule } from '../services/heureka-service/src/heureka/operations/operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env'),
    }),
    PrismaModule,
    LoggerModule,
    ClientsModule,
    HeurekaOperationsModule,
  ],
  providers: [HeurekaAvailabilityReconciliationService],
})
class HeurekaAvailabilityReconciliationCliModule {}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const app = await NestFactory.createApplicationContext(HeurekaAvailabilityReconciliationCliModule, { logger: false });
  try {
    const service = app.get(HeurekaAvailabilityReconciliationService);
    const result = await service.reconcile({
      feedType: argValue('feed-type'),
      limit: argValue('limit') ? Number(argValue('limit')) : undefined,
      dryRun: process.argv.includes('--dry-run'),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error?.message || String(error)}\n`);
  process.exit(1);
});
