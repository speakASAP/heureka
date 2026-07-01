/**
 * Health Service
 */

import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type DependencyStatus = 'ok' | 'error' | 'skipped';
export type OverallHealthStatus = 'ok' | 'degraded' | 'unhealthy';

export interface BasicHealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
}

export interface DependencyHealthResult {
  status: DependencyStatus;
  critical: boolean;
  url?: string;
  httpStatus?: number;
  durationMs?: number;
  message?: string;
}

export interface DependencyHealthStatus {
  contractVersion: 'heureka.dependency-health.v1';
  status: OverallHealthStatus;
  service: string;
  timestamp: string;
  readOnly: true;
  mutations: [];
  dependencies: Record<string, DependencyHealthResult>;
}

export interface DependencyCheckConfig {
  name: string;
  envNames?: string[];
  defaultUrl?: string;
  critical?: boolean;
  kind?: 'database' | 'http';
}

export interface DependencyHealthOptions {
  dependencies?: DependencyCheckConfig[];
}

@Injectable()
export class HealthService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async getHealthStatus(serviceName: string): Promise<BasicHealthStatus> {
    return {
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
    };
  }

  async getDependencyHealthStatus(serviceName: string, options: DependencyHealthOptions = {}): Promise<DependencyHealthStatus> {
    const dependencyConfigs = options.dependencies || this.defaultDependencies(serviceName);
    const dependencies: Record<string, DependencyHealthResult> = {};

    for (const config of dependencyConfigs) {
      if (config.kind === 'database') {
        dependencies[config.name] = await this.checkDatabase(Boolean(config.critical));
        continue;
      }

      dependencies[config.name] = await this.checkHttpDependency(config);
    }

    return {
      contractVersion: 'heureka.dependency-health.v1',
      status: this.calculateOverallStatus(dependencies),
      service: serviceName,
      timestamp: new Date().toISOString(),
      readOnly: true,
      mutations: [],
      dependencies,
    };
  }

  private defaultDependencies(serviceName: string): DependencyCheckConfig[] {
    if (serviceName === 'api-gateway') {
      return [
        { name: 'database', kind: 'database', critical: true },
        { name: 'heurekaService', envNames: ['HEUREKA_SERVICE_URL'], defaultUrl: 'http://heureka-service:3800', critical: true },
        { name: 'aukroService', envNames: ['AUKRO_SERVICE_URL'], defaultUrl: 'http://aukro-service:3700' },
        { name: 'auth', envNames: ['AUTH_SERVICE_URL'], defaultUrl: 'http://auth-microservice:3370', critical: true },
        { name: 'logging', envNames: ['LOGGING_SERVICE_URL'], defaultUrl: 'http://logging-microservice:3367' },
      ];
    }

    return [
      { name: 'database', kind: 'database', critical: true },
      { name: 'auth', envNames: ['AUTH_SERVICE_URL'], defaultUrl: 'http://auth-microservice:3370', critical: true },
      { name: 'catalog', envNames: ['CATALOG_SERVICE_URL'], defaultUrl: 'http://catalog-microservice:3200', critical: true },
      { name: 'warehouse', envNames: ['WAREHOUSE_SERVICE_URL', 'WAREHOUSE_BASE_URL'], defaultUrl: 'http://warehouse-microservice:3201', critical: true },
      { name: 'orders', envNames: ['ORDERS_SERVICE_URL', 'ORDERS_MICROSERVICE_URL', 'ORDER_SERVICE_URL'], defaultUrl: 'http://orders-microservice:3203', critical: true },
      { name: 'logging', envNames: ['LOGGING_SERVICE_URL'], defaultUrl: 'http://logging-microservice:3367' },
      { name: 'notification', envNames: ['NOTIFICATION_SERVICE_URL'], defaultUrl: 'http://notifications-microservice:3368' },
    ];
  }

  private async checkDatabase(critical: boolean): Promise<DependencyHealthResult> {
    const startedAt = Date.now();
    if (!this.prisma?.$queryRaw) {
      return {
        status: 'skipped',
        critical,
        durationMs: Date.now() - startedAt,
        message: '[MISSING: PrismaService unavailable]',
      };
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        critical,
        durationMs: Date.now() - startedAt,
      };
    } catch (error: any) {
      return {
        status: 'error',
        critical,
        durationMs: Date.now() - startedAt,
        message: error?.message || 'Database health check failed',
      };
    }
  }

  private async checkHttpDependency(config: DependencyCheckConfig): Promise<DependencyHealthResult> {
    const startedAt = Date.now();
    const critical = Boolean(config.critical);
    const baseUrl = this.resolveEnvUrl(config.envNames || [], config.defaultUrl);
    if (!baseUrl) {
      return {
        status: 'skipped',
        critical,
        durationMs: Date.now() - startedAt,
        message: `[MISSING: ${config.envNames?.[0] || `${config.name.toUpperCase()}_SERVICE_URL`}]`,
      };
    }

    const healthUrl = this.toHealthUrl(baseUrl);
    const timeoutMs = this.numberEnv('HEALTH_DEPENDENCY_TIMEOUT_MS', 2500, 500, 10000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(healthUrl, {
        headers: { Accept: 'application/json,text/plain,*/*' },
        signal: controller.signal,
      });
      return {
        status: response.ok ? 'ok' : 'error',
        critical,
        url: this.redactUrl(healthUrl),
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        message: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'error',
        critical,
        url: this.redactUrl(healthUrl),
        durationMs: Date.now() - startedAt,
        message: error?.name === 'AbortError'
          ? `Health check timed out after ${timeoutMs}ms`
          : (error?.message || 'HTTP health check failed'),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private resolveEnvUrl(envNames: string[], fallback?: string) {
    for (const envName of envNames) {
      const value = String(process.env[envName] || '').trim();
      if (value) return value;
    }
    return fallback || '';
  }

  private toHealthUrl(baseUrl: string) {
    const withoutTrailingSlash = String(baseUrl || '').replace(/\/+$/, '');
    if (withoutTrailingSlash.endsWith('/api/logs')) {
      return `${withoutTrailingSlash.slice(0, -'/api/logs'.length)}/health`;
    }
    if (withoutTrailingSlash.endsWith('/health')) return withoutTrailingSlash;
    return `${withoutTrailingSlash}/health`;
  }

  private redactUrl(value: string) {
    try {
      const url = new URL(value);
      url.username = '';
      url.password = '';
      return url.toString();
    } catch {
      return value.replace(/\/\/[^:@/]+:[^@/]+@/, '//[redacted]@');
    }
  }

  private numberEnv(name: string, fallback: number, min: number, max: number) {
    const parsed = Number(process.env[name]);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  }

  private calculateOverallStatus(dependencies: Record<string, DependencyHealthResult>): OverallHealthStatus {
    let hasDependencyIssue = false;

    for (const dependency of Object.values(dependencies)) {
      if (dependency.status === 'ok') continue;
      if (dependency.critical) return 'unhealthy';
      hasDependencyIssue = true;
    }

    return hasDependencyIssue ? 'degraded' : 'ok';
  }
}
