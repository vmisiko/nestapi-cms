import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FellowshipZoneEntity } from './infrastructure/fellowship-zone.entity';
import { FellowshipZoneRepository } from './infrastructure/fellowship-zone.repository';
import { FellowshipZonesService } from './application/fellowship-zones.service';
import { FellowshipZonesController } from './presentation/fellowship-zones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FellowshipZoneEntity])],
  controllers: [FellowshipZonesController],
  providers: [FellowshipZoneRepository, FellowshipZonesService],
  exports: [FellowshipZonesService, FellowshipZoneRepository],
})
export class FellowshipZonesModule {}
