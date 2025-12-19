import { HttpException } from '@nestjs/common';
import { ErrorCode, ErrorDefinition, getErrorDefinition, getErrorName } from './error-catalog';

export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(definitionOrCode: ErrorDefinition | ErrorCode, message: string, details?: unknown) {
    const code = typeof definitionOrCode === 'number' ? definitionOrCode : definitionOrCode.code;
    const definition = getErrorDefinition(code);
    super(message || getErrorName(code), definition.statusCode);
    this.code = code;
    this.details = details;
  }
}
