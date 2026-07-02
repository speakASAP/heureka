/**
 * Gateway Controller
 * Routes all API requests to appropriate microservices
 */

import {
  Controller,
  All,
  Get,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { GatewayService, redactGatewayLogText, summarizeGatewayLogPayload } from './gateway.service';
import { HealthService, JwtAuthGuard, LoggerService } from '@heureka/shared';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

@Controller('api')
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);
  private readonly sharedLogger: LoggerService;

  constructor(
    private readonly gatewayService: GatewayService,
    loggerService: LoggerService,
    private readonly healthService: HealthService,
  ) {
    this.sharedLogger = loggerService;
    this.sharedLogger.setContext('GatewayController');
  }

  /**
   * Route OAuth callback (public, no auth required)
   * This endpoint returns a redirect, so we need to handle it specially
   */
  @Get('heureka/oauth/callback')
  async heurekaOAuthCallback(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/heureka', '');
    const method = req.method;
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.sharedLogger.info(`[${requestId}] OAuth callback request`, {
      method,
      path,
      originalUrl: req.originalUrl,
      url: req.url,
      query: req.query,
    });

    try {
      // Don't follow redirects - we want to handle them ourselves
      const response = await this.gatewayService.forwardRequest(
        'aukro',
        `/aukro${path}`,
        method,
        undefined,
        this.getHeaders(req),
        false, // Don't follow redirects
      );

      // If it's a redirect response, redirect the client
      if (response && response._isRedirect && response.location) {
        const duration = Date.now() - startTime;
        this.sharedLogger.info(`[${requestId}] OAuth callback redirecting`, {
          status: response.status,
          location: response.location,
          duration: `${duration}ms`,
        });
        return res.redirect(response.status || 302, response.location);
      }

      // Otherwise return JSON response
      const duration = Date.now() - startTime;
      this.sharedLogger.info(`[${requestId}] OAuth callback completed`, {
        duration: `${duration}ms`,
      });
      return res.status(this.getForwardedStatus(response)).json(this.getForwardedBody(response));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.sharedLogger.error(`[${requestId}] OAuth callback error`, {
        error: redactGatewayLogText(error.message),
        duration: `${duration}ms`,
      });
      const errorStatus = error.response?.status || 500;
      return res.status(errorStatus).json({
        success: false,
        error: {
          code: 'OAUTH_CALLBACK_ERROR',
          message: error.response?.data?.error?.message || error.message || 'OAuth callback failed',
        },
      });
    }
  }

  /**
   * Route /api/heureka/* paths: known Heureka-owned APIs go to heureka-service; unknown legacy paths keep Aukro compatibility.
   */
  @All('heureka/*')
  @UseGuards(JwtAuthGuard)
  async heurekaRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/heureka', '');
    const upstream = `/heureka${path}`;
    const serviceName = this.gatewayService.isHeurekaServiceBackendPath(upstream) ? 'heureka' : 'aukro';
    const backendPath =
      serviceName === 'aukro' ? upstream.replace(/^\/heureka/, '/aukro') : upstream;
    return this.routeRequest(serviceName, backendPath, req, res);
  }

  /**
   * Route import requests (requires auth)
   */
  @All('import/*')
  @UseGuards(JwtAuthGuard)
  async importRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/import', '');
    return this.routeOptionalServiceRequest('import', 'IMPORT_SERVICE_URL or IMPORT_SERVICE_PORT', `/import${path}`, req, res);
  }

  /**
   * Route settings requests (requires auth)
   * Handle both /api/settings and /api/settings/*
   * IMPORTANT: settings/* must come BEFORE settings to match /api/settings/* first
   */
  @All('settings/*')
  @UseGuards(JwtAuthGuard)
  async settingsRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/settings', '');
    return this.routeOptionalServiceRequest('settings', 'SETTINGS_SERVICE_URL or HEUREKA_SETTINGS_SERVICE_PORT', `/settings${path}`, req, res);
  }

  @All('settings')
  @UseGuards(JwtAuthGuard)
  async settingsBaseRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/settings', '') || '';
    return this.routeOptionalServiceRequest('settings', 'SETTINGS_SERVICE_URL or HEUREKA_SETTINGS_SERVICE_PORT', `/settings${path}`, req, res);
  }

  @All('catalog/*')
  @UseGuards(JwtAuthGuard)
  async catalogRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/catalog', '');
    return this.routeRequest('catalog', `/api/catalog${path}`, req, res);
  }

  @All('catalog')
  @UseGuards(JwtAuthGuard)
  async catalogBaseRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/catalog', '') || '';
    return this.routeRequest('catalog', `/api/catalog${path}`, req, res);
  }

  /**
   * Health check endpoint at /api/health
   */
  @Get('health')
  async health(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return res.json({
      status: 'ok',
      service: 'heureka-api-gateway',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Dependency health endpoint at /api/health/dependencies
   */
  @Get('health/dependencies')
  async dependencyHealth(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return res.json(await this.healthService.getDependencyHealthStatus('api-gateway'));
  }

  /**
   * Route auth requests (no auth required for register/login)
   * Must be before catch-all to match correctly
   * Use explicit routes for common endpoints and catch-all for others
   */
  @All('auth/login')
  async authLogin(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    this.logger.debug(`Auth login request | url=${req.originalUrl}`, {
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
    });
    return this.routeRequest('auth', '/auth/login', req, res);
  }

  @All('auth/register')
  async authRegister(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return this.routeRequest('auth', '/auth/register', req, res);
  }

  @All('auth/refresh')
  async authRefresh(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return this.routeRequest('auth', '/auth/refresh', req, res);
  }

  @All('auth/*')
  async authRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    this.sharedLogger.info(`[Auth Route] Matched: ${req.method} ${req.originalUrl}`, {
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
    });
    const path = req.url.replace('/api/auth', '');
    return this.routeRequest('auth', `/auth${path}`, req, res);
  }

  @All('auth')
  async authBaseRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    this.sharedLogger.info(`[Auth Base Route] Matched: ${req.method} ${req.originalUrl}`, {
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
    });
    const path = req.url.replace('/api/auth', '') || '';
    return this.routeRequest('auth', `/auth${path}`, req, res);
  }

  /**
   * Catch-all for /api/ root - return helpful error
   * This must be last to not interfere with specific routes
   */
  @All()
  async apiRoot(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    // Log the request for debugging (production logging)
    this.sharedLogger.warn(`[API Root] Unmatched request: ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      baseUrl: req.baseUrl,
      query: req.query,
      params: req.params,
      headers: {
        host: req.headers.host,
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
      },
    });
    this.logger.warn(`[API Root] Unmatched: ${req.method} ${req.originalUrl} | url: ${req.url} | path: ${req.path}`);
    
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Cannot ${req.method} ${req.url}. ${this.getAvailableEndpointMessage()}`,
      },
      path: req.url,
      originalUrl: req.originalUrl,
      requestPath: req.path,
      timestamp: new Date().toISOString(),
    });
  }

  private routeOptionalServiceRequest(
    serviceName: string,
    missingConfig: string,
    path: string,
    req: ExpressRequest,
    res: ExpressResponse,
  ) {
    if (this.gatewayService.isServiceConfigured(serviceName)) {
      return this.routeRequest(serviceName, path, req, res);
    }

    this.sharedLogger.warn(`[Gateway Optional Route] ${serviceName} service is not configured`, {
      serviceName,
      path,
      method: req.method,
      originalUrl: req.originalUrl,
      missingConfig,
      readOnly: true,
      mutations: [],
    });
    return res.status(501).json({
      success: false,
      readOnly: true,
      mutations: [],
      error: {
        code: 'SERVICE_NOT_CONFIGURED',
        message: `${serviceName} service is not configured for this Heureka gateway.`,
        statusCode: 501,
        serviceName,
        missing: `[MISSING: ${missingConfig}]`,
      },
      path,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Helper to route request
   */
  private async routeRequest(
    serviceName: string,
    path: string,
    req: ExpressRequest,
    res: ExpressResponse,
  ) {
    const method = req.method;
    const body = method !== 'GET' && method !== 'DELETE' ? req.body : undefined;
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Log incoming request with detailed body information
    this.sharedLogger.info(`[${timestamp}] [TIMING] GatewayController.routeRequest START`, {
      requestId,
      serviceName,
      method,
      path,
    });
    this.sharedLogger.info(`[${requestId}] Incoming API request`, {
      serviceName,
      method,
      path,
      originalUrl: req.originalUrl,
      url: req.url,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      hasAuth: !!req.headers.authorization,
      hasBody: !!body,
      bodyType: typeof body,
      bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
      contentType: req.headers['content-type'],
    });
    this.logger.log(`[${requestId}] ${method} ${req.originalUrl} -> ${serviceName}${path}`);

    try {
      const response = await this.gatewayService.forwardRequest(
        serviceName,
        path,
        method,
        body,
        this.getHeaders(req),
      );
      
      const duration = Date.now() - startTime;
      this.sharedLogger.info(`[${new Date().toISOString()}] [TIMING] GatewayController.routeRequest COMPLETE (${duration}ms)`, {
        requestId,
        serviceName,
        method,
        path,
        statusCode: this.getForwardedStatus(response),
        durationMs: duration,
      });
      this.sharedLogger.info(`[${requestId}] Request completed successfully`, {
        serviceName,
        method,
        path,
        statusCode: this.getForwardedStatus(response),
        duration: `${duration}ms`,
      });
      
      res.status(this.getForwardedStatus(response)).json(this.getForwardedBody(response));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorStatus = error.response?.status || error.status;
      const errorDetails = {
        serviceName,
        method,
        path,
        originalUrl: req.originalUrl,
        duration: `${duration}ms`,
        errorType: error.constructor?.name,
        errorMessage: redactGatewayLogText(error.message),
        errorCode: error.code,
        errorStatus,
        errorDataSummary: summarizeGatewayLogPayload(error.response?.data),
      };

      // Handle 401 Unauthorized - don't log as error for auth endpoints (expected response)
      if (errorStatus === 401 && serviceName === 'auth') {
        // Pass through the 401 response from auth service
        const errorData = error.response?.data || { message: 'Invalid credentials', error: 'Unauthorized' };
        this.sharedLogger.info(`[${requestId}] Authentication failed (expected)`, {
          serviceName,
          method,
          path,
          duration: `${duration}ms`,
        });
        this.logger.debug(`[${requestId}] ${method} ${req.originalUrl} - 401 (authentication failed)`);
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: errorData.message || 'Invalid credentials',
            statusCode: 401,
          },
        });
        return;
      }

      // Handle UnauthorizedException properly
      if (error instanceof UnauthorizedException) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: error.message || 'Authentication required',
          },
        });
        return;
      }

      // Log other errors
      this.sharedLogger.error(`[${requestId}] Request failed`, errorDetails);
      this.logger.error(`[${requestId}] ${method} ${req.originalUrl} failed: ${redactGatewayLogText(error.message)}`, errorDetails);

      // Handle timeout errors (auth service unreachable)
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `Unable to reach ${serviceName} service. Please check if the service is running and accessible.`,
          },
        });
        return;
      }

      // Handle connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `Cannot connect to ${serviceName} service. Please check network connectivity and service configuration.`,
          },
        });
        return;
      }

      // Handle 409 Conflict (user already exists, etc.)
      if (error.response?.status === 409) {
        res.status(409).json({
          success: false,
          error: {
            code: error.response?.data?.error?.code || 'CONFLICT',
            message: error.response?.data?.error?.message || error.response?.data?.message || 'Resource already exists',
          },
        });
        return;
      }

      // Handle other errors
      const statusCode = error.response?.status || error.status || 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'GATEWAY_ERROR',
          message: error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Internal server error',
        },
      });
    }
  }


  private getForwardedStatus(response: any): number {
    const status = Number(response?._gatewayStatus || response?.status || 200);
    return Number.isInteger(status) && status >= 100 && status <= 599 ? status : 200;
  }

  private getForwardedBody(response: any): any {
    if (response && response._isGatewayResponse) {
      return response.data;
    }
    return response;
  }

  private getAvailableEndpointMessage(): string {
    const endpoints = ['/api/auth/*', '/api/heureka/*', '/api/catalog/*'];
    if (this.gatewayService.isServiceConfigured('import')) endpoints.push('/api/import/*');
    if (this.gatewayService.isServiceConfigured('settings')) endpoints.push('/api/settings/*');
    const optional = [
      this.gatewayService.isServiceConfigured('import') ? null : '/api/import/* requires IMPORT_SERVICE_URL or IMPORT_SERVICE_PORT',
      this.gatewayService.isServiceConfigured('settings') ? null : '/api/settings/* requires SETTINGS_SERVICE_URL or HEUREKA_SETTINGS_SERVICE_PORT',
    ].filter(Boolean);
    return [
      `Available endpoints: ${endpoints.join(', ')}.`,
      optional.length ? `Optional endpoints: ${optional.join('; ')}.` : '',
    ].filter(Boolean).join(' ');
  }

  /**
   * Get headers from request
   */
  private getHeaders(req: ExpressRequest): Record<string, string> {
    const headers: Record<string, string> = {};

    // Forward authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // Forward user ID if available from JWT guard
    if ((req as any).user?.id) {
      headers['X-User-Id'] = (req as any).user.id;
    }

    return headers;
  }
}
