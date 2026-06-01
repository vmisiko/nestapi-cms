import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UwaziiDlrDto {
  /** Uwazii's per-message reference ID */
  @IsString()
  id: string;

  /** Recipient phone number */
  @IsString()
  to: string;

  /** Delivery status from Uwazii */
  @IsIn(['delivered', 'failed', 'undelivered', 'sent', 'pending'])
  status: string;

  @IsOptional()
  @IsDateString()
  delivered_at?: string;

  @IsOptional()
  @IsString()
  error?: string;
}
