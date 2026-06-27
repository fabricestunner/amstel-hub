import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuthenticatedUser } from '../decorators';
import { AuditService } from '../../modules/audit/audit.service';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const REDACT = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'refreshToken',
  'code',
  'token',
]);

/**
 * Globally records mutating requests to the audit log after they succeed.
 * Sensitive fields are redacted; reads (GET) and noisy endpoints are skipped.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!MUTATING.has(req.method)) return next.handle();

    // Skip high-frequency / non-auditable paths.
    const url = req.originalUrl ?? req.url;
    if (/\/auth\/(login|refresh|register|verify|forgot|reset)/.test(url)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result) => {
        const user = (req as Request & { user?: AuthenticatedUser }).user;
        const segments = url.split('?')[0].split('/').filter(Boolean);
        // .../api/v1/<entityType>/<id?>
        const idx = segments.findIndex((s) => s === 'v1');
        const entityType = segments[idx + 1] ?? 'unknown';
        const maybeId = segments[idx + 2];
        const resultId =
          result && typeof result === 'object' && 'id' in result
            ? String((result as { id: unknown }).id)
            : undefined;

        void this.audit.record({
          actorId: user?.id ?? null,
          action: `${req.method} ${entityType}`,
          entityType,
          entityId: maybeId ?? resultId ?? null,
          after: this.sanitize(req.body),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }),
    );
  }

  private sanitize(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      clone[k] = REDACT.has(k) ? '[redacted]' : v;
    }
    return clone;
  }
}
