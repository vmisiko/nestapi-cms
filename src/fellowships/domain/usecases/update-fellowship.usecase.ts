import type {
  IFellowshipRepository,
  UpdateFellowshipData,
} from '../i-fellowship.repository';
import { generateSlug } from '../../../core/domain/slug';

export class UpdateFellowshipUseCase {
  constructor(private readonly repo: IFellowshipRepository) {}

  execute(id: string, data: UpdateFellowshipData) {
    const update: UpdateFellowshipData = { ...data };
    if (data.name) update.slug = generateSlug(data.name);
    return this.repo.update(id, update);
  }
}
