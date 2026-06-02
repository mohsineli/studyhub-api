import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Note } from '../../notes/entities/note.entity';
import { ReviewLike } from './review-like.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_reviews_user')
  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_reviews_note')
  @Column()
  note_id: number;

  @ManyToOne(() => Note, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @Column({ type: 'int', width: 1 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Index('idx_reviews_parent')
  @Column({ nullable: true })
  parent_id: number | null;

  @ManyToOne(() => Review, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Review;

  @OneToMany(() => Review, review => review.parent)
  children: Review[];

  @Column({ default: 0 })
  likes_count: number;

  @Column({ default: 0 })
  dislikes_count: number;

  @OneToMany(() => ReviewLike, like => like.review)
  likes: ReviewLike[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn({ nullable: true })
  updated_at: Date;
}
