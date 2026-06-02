import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { NoteReaction } from './note-reaction.entity';

export enum NoteStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_notes_uploader')
  @Column()
  uploader_id: number;

  @ManyToOne(() => User, (user) => user.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: false })
  courseTitle: string;

  @Column({ length: 50, nullable: false })
  code: string;

  @Index('idx_notes_dept')
  @Column({ length: 100, nullable: false })
  dept: string;

  @Column({ type: 'text' })
  file_path: string;

  @Column({ length: 20, nullable: false })
  file_type: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avg_rating: number;

  @Column({ type: 'int', default: 0 })
  total_ratings: number;

  @Index('idx_notes_status')
  @Column({
    type: 'simple-enum',
    enum: NoteStatus,
    default: NoteStatus.PENDING,
  })
  status: NoteStatus;

  @Column({ type: 'int', default: 0 })
  downloads: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  created_at: Date;

  @OneToMany(() => Bookmark, (bookmark) => bookmark.note)
  bookmarks: Bookmark[];

  @OneToMany(() => NoteReaction, (reaction) => reaction.note)
  reactions: NoteReaction[];
}
