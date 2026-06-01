export type DataErrorKind =
  | 'NetworkError'
  | 'ValidationError'
  | 'BusinessRuleError'
  | 'AuthenticationError'
  | 'AuthorizationError'
  | 'NotFoundError'
  | 'ConflictError';

export class DataError extends Error {
  constructor(
    public readonly kind: DataErrorKind,
    public override readonly message: string,
  ) {
    super(message);
    this.name = kind;
  }

  static notFound(message: string): DataError {
    return new DataError('NotFoundError', message);
  }

  static conflict(message: string): DataError {
    return new DataError('ConflictError', message);
  }

  static unauthorized(message: string): DataError {
    return new DataError('AuthenticationError', message);
  }

  static forbidden(message: string): DataError {
    return new DataError('AuthorizationError', message);
  }

  static validation(message: string): DataError {
    return new DataError('ValidationError', message);
  }

  static businessRule(message: string): DataError {
    return new DataError('BusinessRuleError', message);
  }
}
