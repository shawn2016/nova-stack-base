import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { OperLogService } from './oper-log.service';
import {
  resolveActionFromMethod,
  resolveModuleFromPath,
  sanitizeRequestBody,
  shouldAuditOperLog,
} from './oper-log.utils';

@Injectable()
export class OperLogInterceptor implements NestInterceptor {
  constructor(private readonly operLogService: OperLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: AuthUser }>();
    const method = request.method;
    const path = request.path ?? request.url ?? '';
    const user = request.user;

    if (!shouldAuditOperLog(method, path, user?.type)) {
      return next.handle();
    }

    const startedAt = Date.now();
    const moduleName = resolveModuleFromPath(path);
    const action = resolveActionFromMethod(method);
    const requestSummary = sanitizeRequestBody(request.body);
    const ip = request.ip ?? request.socket.remoteAddress ?? '';

    const record = (success: boolean, errorMsg?: string | null) => {
      void this.operLogService.write({
        userId: user!.userId,
        module: moduleName,
        action,
        method,
        path: path.split('?')[0] ?? path,
        ip,
        requestSummary,
        success,
        errorMsg: errorMsg ?? null,
        durationMs: Date.now() - startedAt,
      });
    };

    return next.handle().pipe(
      tap(() => record(true)),
      catchError((error: { message?: string }) => {
        record(false, error?.message ?? 'Unknown error');
        return throwError(() => error);
      }),
    );
  }
}
