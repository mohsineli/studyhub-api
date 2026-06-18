import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum AppPlatform {
  ANDROID = 'android',
  IOS = 'ios',
}

@Entity('app_releases')
export class AppRelease {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_app_releases_platform')
  @Column({ type: 'simple-enum', enum: AppPlatform })
  platform: AppPlatform;

  @Column({ length: 50 })
  version: string;

  // R2 object key (raw key; the frontend prepends the public CDN base)
  @Column({ type: 'text' })
  file_path: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_name: string | null;

  // Size in bytes (APK/IPA files comfortably fit in a 32-bit int, < 2 GB)
  @Column({ type: 'int', default: 0 })
  file_size: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // How many times this build has been downloaded
  @Column({ type: 'int', default: 0 })
  downloads: number;

  @Column({ type: 'int', nullable: true })
  uploaded_by: number | null;

  @CreateDateColumn()
  created_at: Date;
}
