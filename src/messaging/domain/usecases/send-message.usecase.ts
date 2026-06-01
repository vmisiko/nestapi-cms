import { DataError } from '../../../core/domain/data-error';
import { Either } from '../../../core/domain/either';
import type { IMessageRepository } from '../i-message.repository';
import { MessageStatus } from '../message';
import type { Message } from '../message';

export class SendMessageUseCase {
  constructor(private readonly repo: IMessageRepository) {}

  async execute(id: string): Promise<Either<DataError, void>> {
    const found = await this.repo.findById(id);
    if (found.isLeft()) return found as unknown as Either<DataError, void>;

    const msg = found.getOrElse(null as unknown as Message);
    if (msg.status === MessageStatus.SENT) {
      return Either.left(
        DataError.businessRule('Message has already been sent'),
      );
    }

    const result = await this.repo.markSent(id, new Date());
    return result.fold(
      (err) => Either.left(err),
      () => Either.right(undefined),
    );
  }
}
