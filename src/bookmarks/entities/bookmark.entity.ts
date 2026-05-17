import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Note } from '../../notes/entities/note.entity';
import { Resource } from '../../resources/entities/resource.entity';

@Entity('bookmarks')
@Unique('unique_user_note', ['user_id', 'note_id'])
@Unique('unique_user_resource', ['user_id', 'resource_id'])
@Unique('unique_user_subject', ['user_id', 'subject_name'])
export class Bookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index('idx_user_id')
  user_id: number;

  @ManyToOne(() => User, (user) => user.bookmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  note_id: number;

  @ManyToOne(() => Note, (note) => note.bookmarks, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @Column({ nullable: true })
  resource_id: number;

  @ManyToOne(() => Resource, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column({ length: 255, nullable: true })
  subject_name: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  created_at: Date;
}
