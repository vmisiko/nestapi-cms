import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { FellowshipEntity } from '../../fellowships/infrastructure/fellowship.entity';
import type { MemberEntity } from '../../members/infrastructure/member.entity';

@Entity('fellowship_zones')
export class FellowshipZoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ name: 'overseer_id', type: 'uuid', nullable: true })
  overseerId: string | null;

  @ManyToOne('MemberEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'overseer_id' })
  overseer?: MemberEntity;

  @OneToMany('FellowshipEntity', 'zone')
  fellowships: FellowshipEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
