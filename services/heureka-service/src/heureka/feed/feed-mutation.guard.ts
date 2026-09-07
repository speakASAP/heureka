import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

const FEED_MUTATION_ROLES: ReadonlySet<string> = new Set([
  'internal:heureka-service:feed',
]);

/**
 * Auth RS256 gate for Heureka feed mutation routes.
 *
 * Validates Authorization Bearer via POST AUTH_SERVICE_URL/auth/validate.
 * Legacy static shared-secret header auth is deleted.
 */
@Injectable()
export class HeurekaFeedMutationGuard implements CanActivate {
  private readonly authServiceUrl = (
    process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370'
  ).replace(/\/+$/, '');
  private readonly authValidateTimeoutMs = Number(
    process.env.AUTH_VALIDATE_TIMEOUT_MS || 3000,
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const roles = await this.validateRoles(token);
    if (!roles.some((role) => FEED_MUTATION_ROLES.has(role))) {
      throw new ForbiddenException('Principal is not permitted to mutate Heureka feed state');
    }

    request.user = {
      id: 'service:heureka-feed-mutation',
      roles: roles.filter((role) => FEED_MUTATION_ROLES.has(role)),
    };
    return true;
  }

  private async validateRoles(token: string): Promise<string[]> {
    const controller = new AbortController();
    const timeoutMs =
      Number.isFinite(this.authValidateTimeoutMs) && this.authValidateTimeoutMs > 0
        ? this.authValidateTimeoutMs
        : 3000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.authServiceUrl}/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: controller.signal,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'heureka_feed_mutation_auth_validate_unreachable',
          message: 'Auth validate unreachable during Heureka feed mutation',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw new UnauthorizedException('Invalid token');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new UnauthorizedException('Invalid token');
    }

    let data: { valid?: boolean; user?: { roles?: unknown } };
    try {
      data = (await response.json()) as { valid?: boolean; user?: { roles?: unknown } };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!data.valid || !data.user) {
      throw new UnauthorizedException('Invalid token');
    }

    return Array.isArray(data.user.roles)
      ? data.user.roles.filter((role): role is string => typeof role === 'string')
      : [];
  }
}
