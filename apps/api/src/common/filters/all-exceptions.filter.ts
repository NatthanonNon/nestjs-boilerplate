import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppException } from '../errors/app.exception';
import {
  ErrorCode,
  ERROR_CATALOG,
  getErrorDefinition,
  getErrorName,
  isErrorCode,
  mapPgErrorCode
} from '../errors/error-catalog';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly traceDir: string;
  private readonly traceRetentionMs?: number;
  private lastTraceCleanupAt = 0;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    options?: { logDir?: string; traceDir?: string; traceRetentionDays?: number }
  ) {
    const baseLogDir = options?.logDir ?? process.env.LOG_DIR ?? 'logs';
    const resolvedBaseLogDir = path.resolve(baseLogDir);
    this.traceDir = options?.traceDir
      ? path.resolve(options.traceDir)
      : path.join(resolvedBaseLogDir, 'traces');

    const retentionDays =
      options?.traceRetentionDays ?? parseInt(process.env.LOG_RETENTION_DAYS || '0', 10);
    this.traceRetentionMs =
      retentionDays && retentionDays > 0 ? retentionDays * 24 * 60 * 60 * 1000 : undefined;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalizeException(exception);
    const responseBody = this.buildResponseBody(normalized, request);

    if (normalized.status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${normalized.status} - ${responseBody.requestId || 'no-request-id'}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    if (normalized.status >= 400) {
      void this.writeTraceFile(exception, request, normalized).catch((error) => {
        this.logger.error(
          `Failed to write error trace: ${error instanceof Error ? error.message : 'unknown'}`
        );
      });
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, normalized.status);
  }

  private buildResponseBody(normalized: NormalizedException, request: Request) {
    const response: Record<string, unknown> = {
      statusCode: normalized.status,
      errorCode: normalized.code,
      error: getErrorName(normalized.code),
      message: normalized.message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.requestId
    };

    if (normalized.details !== undefined) {
      response.details = normalized.details;
    }

    return response;
  }

  private normalizeException(exception: unknown): NormalizedException {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message || getErrorName(exception.code),
        details: exception.details
      };
    }

    const multerError = this.fromMulterError(exception);
    if (multerError) {
      return multerError;
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    const dbError = this.fromDbException(exception);
    if (dbError) {
      return dbError;
    }

    const definition = getErrorDefinition(ERROR_CATALOG.UNKNOWN.code);
    const fallbackMessage =
      exception instanceof Error && exception.message ? exception.message : 'Unexpected error';

    return {
      status: definition.statusCode,
      code: definition.code,
      message: fallbackMessage
    };
  }

  private fromMulterError(exception: unknown): NormalizedException | null {
    if (!exception || typeof exception !== 'object') {
      return null;
    }

    const error = exception as { name?: string; code?: string; message?: string };
    if (error.name !== 'MulterError') {
      return null;
    }

    const code =
      error.code === 'LIMIT_FILE_SIZE'
        ? ERROR_CATALOG.VALIDATION_FAILED.code
        : ERROR_CATALOG.BAD_REQUEST.code;

    return {
      status: HttpStatus.BAD_REQUEST,
      code,
      message: error.message || getErrorName(code),
      details: error.code ? { multerCode: error.code } : undefined
    };
  }

  private fromHttpException(exception: HttpException): NormalizedException {
    const status = exception.getStatus();
    const response = exception.getResponse();
    let message: string | undefined = exception.message;
    let details: unknown;
    let explicitCode: ErrorCode | undefined;

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      const data = response as Record<string, unknown>;
      if (isErrorCode(data.errorCode)) {
        explicitCode = data.errorCode as ErrorCode;
      }
      if (Array.isArray(data.message)) {
        details = data.message;
        message = data.message[0] || message;
      } else if (typeof data.message === 'string') {
        message = data.message;
      } else if (typeof data.error === 'string') {
        message = data.error;
      }

      if (data.details !== undefined) {
        details = data.details;
      }
    }

    const code = explicitCode || this.mapHttpStatusToErrorCode(status, details);

    return {
      status,
      code,
      message: message || getErrorName(code),
      details
    };
  }

  private fromDbException(exception: unknown): NormalizedException | null {
    if (!exception || typeof exception !== 'object') {
      return null;
    }

    const error = exception as {
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      message?: string;
    };

    if (!error.code || !/^[A-Z0-9]{5}$/i.test(error.code)) {
      return null;
    }

    const code = mapPgErrorCode(error.code);
    const definition = getErrorDefinition(code);
    const details = this.buildDbDetails(error);
    const message = error.detail || error.message || getErrorName(code);

    return {
      status: definition.statusCode,
      code,
      message,
      details
    };
  }

  private buildDbDetails(error: {
    code?: string;
    detail?: string;
    constraint?: string;
    table?: string;
  }) {
    const details: Record<string, string> = {};

    if (error.code) {
      details.dbCode = error.code;
    }

    if (error.constraint) {
      details.constraint = error.constraint;
    }

    if (error.table) {
      details.table = error.table;
    }

    if (error.detail) {
      details.detail = error.detail;
    }

    return Object.keys(details).length > 0 ? details : undefined;
  }

  private mapHttpStatusToErrorCode(status: number, details: unknown) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return Array.isArray(details)
          ? ERROR_CATALOG.VALIDATION_FAILED.code
          : ERROR_CATALOG.BAD_REQUEST.code;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CATALOG.UNAUTHORIZED.code;
      case HttpStatus.FORBIDDEN:
        return ERROR_CATALOG.FORBIDDEN.code;
      case HttpStatus.NOT_FOUND:
        return ERROR_CATALOG.RESOURCE_NOT_FOUND.code;
      case HttpStatus.CONFLICT:
        return ERROR_CATALOG.CONFLICT.code;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ERROR_CATALOG.VALIDATION_FAILED.code;
      default:
        return ERROR_CATALOG.UNKNOWN.code;
    }
  }

  private async writeTraceFile(
    exception: unknown,
    request: Request,
    normalized: NormalizedException
  ) {
    const requestId = request.requestId || 'no-request-id';
    const timestamp = new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, '-');
    const filename = `${safeTimestamp}_${requestId}.log`;
    const filePath = path.join(this.traceDir, filename);

    const payload = {
      timestamp,
      requestId,
      method: request.method,
      url: request.url,
      statusCode: normalized.status,
      errorCode: normalized.code,
      error: getErrorName(normalized.code),
      message: normalized.message,
      details: normalized.details,
      stack: exception instanceof Error ? exception.stack : undefined
    };

    await fs.mkdir(this.traceDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    await this.cleanupOldTracesIfNeeded();
  }

  private async cleanupOldTracesIfNeeded() {
    if (!this.traceRetentionMs) {
      return;
    }

    const now = Date.now();
    if (now - this.lastTraceCleanupAt < 60 * 60 * 1000) {
      return;
    }

    this.lastTraceCleanupAt = now;
    const cutoff = now - this.traceRetentionMs;

    let entries;
    try {
      entries = await fs.readdir(this.traceDir, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.log'))
        .map(async (entry) => {
          const fullPath = path.join(this.traceDir, entry.name);
          const stats = await fs.stat(fullPath).catch(() => null);
          if (stats && stats.mtimeMs < cutoff) {
            await fs.unlink(fullPath).catch(() => undefined);
          }
        })
    );
  }
}

type NormalizedException = {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
};
