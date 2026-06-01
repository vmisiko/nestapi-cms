export class Either<L, R> {
  private constructor(
    private readonly _left: L | undefined,
    private readonly _right: R | undefined,
    private readonly _isRight: boolean,
  ) {}

  static left<L, R = never>(value: L): Either<L, R> {
    return new Either<L, R>(value, undefined, false);
  }

  static right<R, L = never>(value: R): Either<L, R> {
    return new Either<L, R>(undefined, value, true);
  }

  isRight(): boolean {
    return this._isRight;
  }

  isLeft(): boolean {
    return !this._isRight;
  }

  fold<T>(leftFn: (l: L) => T, rightFn: (r: R) => T): T {
    return this._isRight ? rightFn(this._right as R) : leftFn(this._left as L);
  }

  map<T>(fn: (r: R) => T): Either<L, T> {
    return this._isRight
      ? Either.right<T, L>(fn(this._right as R))
      : Either.left<L, T>(this._left as L);
  }

  getOrElse(defaultValue: R): R {
    return this._isRight ? (this._right as R) : defaultValue;
  }
}
