import { HttpException, HttpStatus } from '@nestjs/common';
import type { DataErrorKind } from '../domain/data-error';

export function toHttpException(
  kind: DataErrorKind,
  message: string,
): HttpException {
  const map: Record<DataErrorKind, HttpStatus> = {
    NotFoundError: HttpStatus.NOT_FOUND,
    ConflictError: HttpStatus.CONFLICT,
    AuthenticationError: HttpStatus.UNAUTHORIZED,
    AuthorizationError: HttpStatus.FORBIDDEN,
    ValidationError: HttpStatus.BAD_REQUEST,
    BusinessRuleError: HttpStatus.UNPROCESSABLE_ENTITY,
    NetworkError: HttpStatus.INTERNAL_SERVER_ERROR,
  };
  return new HttpException(
    message,
    map[kind] ?? HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
