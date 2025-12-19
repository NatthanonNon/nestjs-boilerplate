import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { method, originalUrl } = request;
    const requestId = request.requestId || 'no-request-id';
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startedAt;
          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} ${duration}ms - ${requestId}`
          );
        },
        error: (error) => {
          const duration = Date.now() - startedAt;
          const status = error instanceof HttpException ? error.getStatus() : 500;
          this.logger.error(`${method} ${originalUrl} ${status} ${duration}ms - ${requestId}`);
        }
      })
    );
  }
}
