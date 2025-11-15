import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LocationBlock } from '../entities/location-block.entity';
import { Puller } from '../entities/puller.entity';
import { Rider } from '../entities/rider.entity';

/**
 * RideStatus Enum
 * Defines all possible states of a ride
 */
export enum RideStatus {
  PENDING_USER_CONFIRMATION = 'PENDING_USER_CONFIRMATION',
  SEARCHING = 'SEARCHING',
  ACCEPTED = 'ACCEPTED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Ride Entity
 * Represents a ride request/booking in the system
 */
@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: RideStatus,
    default: RideStatus.PENDING_USER_CONFIRMATION,
  })
  status: RideStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requestTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickupTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  completionTime: Date;

  @Column({ type: 'int', nullable: true })
  pointsAwarded: number;

  @Column({ type: 'simple-array', nullable: true })
  rejectedByPullers: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => LocationBlock, (locationBlock) => locationBlock.ridesStarting, {
    eager: true,
  })
  @JoinColumn({ name: 'startBlockId' })
  startBlock: LocationBlock;

  @ManyToOne(() => LocationBlock, (locationBlock) => locationBlock.ridesEnding, {
    eager: true,
  })
  @JoinColumn({ name: 'destinationBlockId' })
  destinationBlock: LocationBlock;

  @ManyToOne(() => Puller, (puller) => puller.rides, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'pullerId' })
  puller: Puller;

  @ManyToOne(() => Rider, (rider) => rider.rides, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'riderId' })
  rider: Rider;
}
