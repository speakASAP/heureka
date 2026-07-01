/**
 * Heureka feed service entry (Heureka.cz / Heureka.sk XML feeds)
 */

import 'reflect-metadata';

// Node.js v22+ native Reflect.decorate breaks NestJS decorator metadata — patch before any imports
const _originalDecorate = (Reflect as any).decorate;
(Reflect as any).decorate = function (decorators: any[], target: any, key?: any, desc?: any) {
  if (key !== undefined && desc === null) {
    desc = Object.getOwnPropertyDescriptor(target, key) || null;
  }
  return _originalDecorate.call(this, decorators, target, key, desc);
};

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
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
      { path: 'login', method: RequestMethod.GET },
      { path: 'register', method: RequestMethod.GET },
      { path: 'auth/callback', method: RequestMethod.GET },
      { path: 'dashboard', method: RequestMethod.GET },
      { path: 'dashboard/products', method: RequestMethod.GET },
      { path: 'dashboard/admin/users', method: RequestMethod.GET },
    ],
  });

  const port =
    configService.get<string>('HEUREKA_SERVICE_PORT') ||
    configService.get<string>('PORT') ||
    '3800';
  await app.listen(parseInt(port, 10));
  console.log(`Heureka feed service listening on http://localhost:${port}`);
}

bootstrap();
