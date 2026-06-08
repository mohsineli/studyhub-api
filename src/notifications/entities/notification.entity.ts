import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  COMMENT_REPLY = 'comment_reply',
  MENTION = 'mention',
  NOTE_APPROVED = 'note_approved',
  NOTE_REJECTED = 'note_rejected',
  NOTE_COMMENT = 'note_comment',
  COMMUNITY_REPLY = 'community_reply',
  COMMUNITY_MENTION = 'community_mention',
  NOTE_LIKE = 'note_like',
  COMMENT_LIKE = 'comment_like',
  NOTE_DOWNLOAD = 'note_download',
  RESOURCE_APPROVED = 'resource_approved',
  RESOURCE_REJECTED = 'resource_rejected',
  SYSTEM = 'system',
}

@Entity('notifications')
@Index(['user_id', 'is_read', 'created_at'])
@Index(['user_id', 'created_at'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ type: 'int', nullable: true })
  actor_id: number | null;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ length: 50 })
  entity_type: string;

  @Column({ type: 'int', nullable: true })
  entity_id: number | null;

  @Column({ type: 'text', nullable: true })
  redirect_url: string | null;

  @Column({ default: false })
  is_read: boolean;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: Date | null) => (value ? value.toISOString() : null),
      from: (value: string | null) => (value ? new Date(value) : null),
    },
  })
  read_at: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
