import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareRecordEntity } from './infrastructure/care-record.entity';
import { CareRecordRepository } from './infrastructure/care-record.repository';
import { CareService } from './application/care.service';

@Module({
  imports: [TypeOrmModule.forFeature([CareRecordEntity])],
  providers: [CareRecordRepository, CareService],
  exports: [CareService],
})
export class CareModule {}
