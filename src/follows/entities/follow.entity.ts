import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('follows')
@Unique('unique_follow', ['follower_id', 'following_id'])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  /** The user who follows. */
  @Column()
  @Index('idx_follow_follower')
  follower_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  /** The user being followed. */
  @Column()
  @Index('idx_follow_following')
  following_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following: User;

  @CreateDateColumn()
  created_at: Date;
}
