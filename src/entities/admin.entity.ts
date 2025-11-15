import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Admin Entity
 * Represents an admin user in the system
 */
@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 50, default: 'Administrator' })
  role: string;

  @Column({ type: 'json', nullable: true })
  settings: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    soundEnabled?: boolean;
    theme?: string;
    compactMode?: boolean;
    mapProvider?: string;
    defaultZoom?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
