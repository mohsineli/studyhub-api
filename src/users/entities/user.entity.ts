import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { Note } from '../../notes/entities/note.entity';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';

export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Index('idx_users_role')
  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Index('idx_users_points')
  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Index('idx_users_banned')
  @Column({ type: 'boolean', default: false })
  banned: boolean;

  @Column({ length: 255, nullable: true })
  dept: string;

  @Column({ length: 255, nullable: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  profile_pic: string;

  @Column({ length: 255, nullable: true })
  github: string;

  @Column({ length: 255, nullable: true })
  linkedin: string;

  @Column({ length: 255, nullable: true })
  instagram: string;

  @Column({ length: 255, nullable: true })
  facebook: string;

  @Column({ length: 10, default: 'dark' })
  preferred_theme: string;

  @Column({ length: 6, nullable: true })
  otp: string;

  @Column({ type: 'timestamp', nullable: true })
  otp_expires_at: Date;

  @Index('idx_users_last_active')
  @Column({ type: 'timestamp', nullable: true })
  last_active_at: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  created_at: Date;

  @OneToMany(() => Note, (note) => note.uploader)
  notes: Note[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  bookmarks: Bookmark[];
}
