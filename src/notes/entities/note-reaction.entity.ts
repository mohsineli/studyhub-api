import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Note } from './note.entity';

@Entity('note_reactions')
@Unique(['note_id', 'user_id'])
export class NoteReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  note_id: number;

  @ManyToOne(() => Note, (note) => note.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 10 })
  reaction: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  created_at: Date;
}
