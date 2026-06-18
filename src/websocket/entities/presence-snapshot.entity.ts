import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** A point-in-time count of online users by client, for online-history analytics. */
@Entity('presence_snapshots')
export class PresenceSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ type: 'int', default: 0 })
  web: number;

  @Column({ type: 'int', default: 0 })
  android: number;

  @Column({ type: 'int', default: 0 })
  ios: number;

  @Column({ type: 'int', default: 0 })
  app: number;

  @Index('idx_presence_snapshots_captured')
  @CreateDateColumn()
  captured_at: Date;
}
