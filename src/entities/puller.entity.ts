import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Ride } from '../rides/ride.entity';
import { PointsHistory } from './points-history.entity';

/**
 * Puller Entity
 * Represents a rickshaw puller in the system
 */
@Entity('pullers')
export class Puller {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ unique: true, type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'int', default: 0 })
  pointsBalance: number;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'float', nullable: true })
  lastKnownLat: number;

  @Column({ type: 'float', nullable: true })
  lastKnownLon: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Ride, (ride) => ride.puller)
  rides: Ride[];

  @OneToMany(() => PointsHistory, (pointsHistory) => pointsHistory.puller)
  pointsHistory: PointsHistory[];
}
