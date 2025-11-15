import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Ride } from '../rides/ride.entity';

/**
 * LocationBlock Entity
 * Represents a geographical location/block in the system
 */
@Entity('location_blocks')
export class LocationBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'varchar', length: 100 })
  blockId: string;

  @Column({ type: 'varchar', length: 255 })
  destinationName: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Ride, (ride) => ride.startBlock)
  ridesStarting: Ride[];

  @OneToMany(() => Ride, (ride) => ride.destinationBlock)
  ridesEnding: Ride[];
}
