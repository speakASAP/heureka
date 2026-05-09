/**
 * Heureka feed service entry (Heureka.cz / Heureka.sk XML feeds)
 */

import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('heureka', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  const port =
    configService.get<string>('HEUREKA_SERVICE_PORT') ||
    configService.get<string>('PORT') ||
    '3800';
  await app.listen(parseInt(port, 10));
  console.log(`Heureka feed service listening on http://localhost:${port}`);
}

bootstrap();
