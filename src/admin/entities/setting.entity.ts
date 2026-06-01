import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn({ length: 50 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;
}
