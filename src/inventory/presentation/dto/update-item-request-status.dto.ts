import { IsEnum } from 'class-validator';
import type { ItemRequestStatus } from '../../domain/item-request';

export class UpdateItemRequestStatusDto {
  @IsEnum(['pending', 'approved', 'rejected', 'returned'])
  status: ItemRequestStatus;
}
