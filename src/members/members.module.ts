import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberEntity } from './infrastructure/member.entity';
import { MemberRepository } from './infrastructure/member.repository';
import { MembersService } from './application/members.service';
import { MembersController } from './presentation/members.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MemberEntity])],
  controllers: [MembersController],
  providers: [MemberRepository, MembersService],
  exports: [MembersService, MemberRepository],
})
export class MembersModule {}
