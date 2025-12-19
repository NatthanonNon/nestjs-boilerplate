import { HttpStatus } from '@nestjs/common';

export const ERROR_CATALOG = {
  UNKNOWN: { code: 10000, statusCode: HttpStatus.INTERNAL_SERVER_ERROR },
  VALIDATION_FAILED: { code: 10001, statusCode: HttpStatus.BAD_REQUEST },
  RESOURCE_NOT_FOUND: { code: 10002, statusCode: HttpStatus.NOT_FOUND },
  BAD_REQUEST: { code: 10003, statusCode: HttpStatus.BAD_REQUEST },
  UNAUTHORIZED: { code: 10004, statusCode: HttpStatus.UNAUTHORIZED },
  FORBIDDEN: { code: 10005, statusCode: HttpStatus.FORBIDDEN },
  CONFLICT: { code: 10006, statusCode: HttpStatus.CONFLICT },
  USER_NOT_FOUND: { code: 10010, statusCode: HttpStatus.NOT_FOUND },
  DATABASE_ERROR: { code: 20000, statusCode: HttpStatus.INTERNAL_SERVER_ERROR },
  DB_UNIQUE_VIOLATION: { code: 20001, statusCode: HttpStatus.CONFLICT },
  DB_FOREIGN_KEY_VIOLATION: { code: 20002, statusCode: HttpStatus.BAD_REQUEST },
  DB_NOT_NULL_VIOLATION: { code: 20003, statusCode: HttpStatus.BAD_REQUEST },
  DB_CHECK_VIOLATION: { code: 20004, statusCode: HttpStatus.BAD_REQUEST },
  DB_INVALID_INPUT: { code: 20005, statusCode: HttpStatus.BAD_REQUEST },
  EXTERNAL_SERVICE_ERROR: { code: 30000, statusCode: HttpStatus.BAD_GATEWAY }
} as const;

export type ErrorName = keyof typeof ERROR_CATALOG;
export type ErrorDefinition = (typeof ERROR_CATALOG)[ErrorName];
export type ErrorCode = (typeof ERROR_CATALOG)[ErrorName]['code'];

const CODE_TO_NAME = new Map<ErrorCode, ErrorName>(
  Object.entries(ERROR_CATALOG).map(([name, definition]) => [definition.code, name as ErrorName])
);

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'number' && CODE_TO_NAME.has(value as ErrorCode);
}

export function getErrorDefinition(code: ErrorCode) {
  const name = CODE_TO_NAME.get(code) ?? 'UNKNOWN';
  return ERROR_CATALOG[name];
}

export function getErrorName(code: ErrorCode): ErrorName {
  return CODE_TO_NAME.get(code) ?? 'UNKNOWN';
}

export function mapPgErrorCode(pgCode?: string): ErrorCode {
  switch (pgCode) {
    case '23505':
      return ERROR_CATALOG.DB_UNIQUE_VIOLATION.code;
    case '23503':
      return ERROR_CATALOG.DB_FOREIGN_KEY_VIOLATION.code;
    case '23502':
      return ERROR_CATALOG.DB_NOT_NULL_VIOLATION.code;
    case '23514':
      return ERROR_CATALOG.DB_CHECK_VIOLATION.code;
    case '22P02':
    case '22001':
      return ERROR_CATALOG.DB_INVALID_INPUT.code;
    default:
      return ERROR_CATALOG.DATABASE_ERROR.code;
  }
}
