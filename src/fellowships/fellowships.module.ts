import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FellowshipEntity } from './infrastructure/fellowship.entity';
import { FellowshipRepository } from './infrastructure/fellowship.repository';
import { FellowshipsService } from './application/fellowships.service';
import { FellowshipsController } from './presentation/fellowships.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FellowshipEntity])],
  controllers: [FellowshipsController],
  providers: [FellowshipRepository, FellowshipsService],
  exports: [FellowshipsService, FellowshipRepository],
})
export class FellowshipsModule {}
