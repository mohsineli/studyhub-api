import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ResourceTerm {
  MID = 'mid',
  FINAL = 'final',
}

export enum ResourceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_resources_uploader')
  @Column({ nullable: true })
  uploader_id: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  subject: string;

  @Column({ length: 50, nullable: true })
  course_code: string;

  @Column({ type: 'enum', enum: ResourceTerm, nullable: true })
  term: ResourceTerm;

  @Column({ length: 255 })
  file_path: string;

  @Column({ length: 20, nullable: true })
  file_type: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avg_rating: number;

  @Column({ type: 'int', default: 0 })
  downloads: number;

  @Index('idx_resources_status')
  @Column({
    type: 'enum',
    enum: ResourceStatus,
    default: ResourceStatus.PENDING,
  })
  status: ResourceStatus;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  created_at: Date;
}
