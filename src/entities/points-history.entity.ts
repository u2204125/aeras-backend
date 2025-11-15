import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Puller } from './puller.entity';
import { Ride } from '../rides/ride.entity';

/**
 * PointReason Enum
 * Defines reasons for point changes
 */
export enum PointReason {
  RIDE_COMPLETION = 'RIDE_COMPLETION',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  REDEMPTION = 'REDEMPTION',
  FRAUD_REVERSAL = 'FRAUD_REVERSAL',
}

/**
 * PointsHistory Entity
 * Tracks all point changes for pullers
 */
@Entity('points_history')
export class PointsHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  pointsChange: number;

  @Column({
    type: 'enum',
    enum: PointReason,
  })
  reason: PointReason;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Puller, (puller) => puller.pointsHistory, {
    eager: true,
  })
  @JoinColumn({ name: 'pullerId' })
  puller: Puller;

  @ManyToOne(() => Ride, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'rideId' })
  ride: Ride;
}
