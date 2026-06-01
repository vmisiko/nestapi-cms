import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentEntity } from './infrastructure/department.entity';
import { DepartmentRepository } from './infrastructure/department.repository';
import { DepartmentsService } from './application/departments.service';
import { DepartmentsController } from './presentation/departments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DepartmentEntity])],
  controllers: [DepartmentsController],
  providers: [DepartmentRepository, DepartmentsService],
  exports: [DepartmentsService, DepartmentRepository],
})
export class DepartmentsModule {}
