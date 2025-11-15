import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Ride, RideStatus } from './ride.entity';
import { LocationBlock } from '../entities/location-block.entity';
import { Puller } from '../entities/puller.entity';
import { PointsHistory, PointReason } from '../entities/points-history.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { MqttController } from '../notifications/mqtt.controller';

/**
 * RidesService
 * Handles all business logic for ride management
 */
@Injectable()
export class RidesService {
  constructor(
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
    @InjectRepository(LocationBlock)
    private locationBlocksRepository: Repository<LocationBlock>,
    @InjectRepository(Puller)
    private pullersRepository: Repository<Puller>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
    private mqttController: MqttController,
  ) {}

  /**
   * Create a new ride request with PENDING_USER_CONFIRMATION status
   */
  async requestRide(blockId: string): Promise<Ride> {
    const locationBlock = await this.locationBlocksRepository.findOne({
      where: { blockId },
    });

    if (!locationBlock) {
      throw new NotFoundException(`Location block ${blockId} not found`);
    }

    const ride = this.ridesRepository.create({
      startBlock: locationBlock,
      destinationBlock: locationBlock, // Initially same, can be updated
      status: RideStatus.PENDING_USER_CONFIRMATION,
      requestTime: new Date(),
    });

    const savedRide = await this.ridesRepository.save(ride);

    // Broadcast ride status update to admin dashboard
    this.notificationsGateway.broadcastRideStatusUpdate(savedRide);
    console.log(`📢 Broadcasted new ride request ${savedRide.id} to admin dashboard`);

    // Publish to MQTT topic for hardware/IoT devices
    const mqttPayload = {
      rideId: savedRide.id,
      blockId: locationBlock.blockId,
      status: savedRide.status,
      requestTime: savedRide.requestTime,
      timestamp: new Date(),
    };
    this.mqttController.publishRideStatus(savedRide.id, savedRide.status);
    this.mqttController.publish(`aeras/requests/${blockId}/new`, mqttPayload);
    console.log(
      `📡 Published ride request ${savedRide.id} to MQTT topic: aeras/requests/${blockId}/new`,
    );

    return savedRide;
  }

  /**
   * Confirm a pending ride and change status to SEARCHING
   * Triggers ride distribution to nearby pullers
   */
  async confirmRide(blockId: string): Promise<Ride> {
    const ride = await this.ridesRepository.findOne({
      where: {
        startBlock: { blockId },
        status: RideStatus.PENDING_USER_CONFIRMATION,
      },
      order: { requestTime: 'DESC' },
      relations: ['startBlock', 'destinationBlock'],
    });

    if (!ride) {
      throw new NotFoundException(`No pending ride found for block ${blockId}`);
    }

    ride.status = RideStatus.SEARCHING;
    const savedRide = await this.ridesRepository.save(ride);

    // Broadcast ride status update to admin dashboard
    this.notificationsGateway.broadcastRideStatusUpdate(savedRide);
    console.log(`📢 Broadcasted ride ${savedRide.id} status change to SEARCHING`);

    // Publish to MQTT topic
    this.mqttController.publishRideStatus(savedRide.id, savedRide.status);
    console.log(`📡 Published ride ${savedRide.id} status to MQTT: SEARCHING`);

    // Trigger ride distribution logic
    await this.distributeRideToNearbyPullers(savedRide);

    return savedRide;
  }

  /**
   * Rider Alert Distribution System
   * Find nearby online pullers and notify them via MQTT
   */
  private async distributeRideToNearbyPullers(ride: Ride): Promise<void> {
    const onlinePullers = await this.pullersRepository.find({
      where: { isOnline: true, isActive: true },
    });

    if (onlinePullers.length === 0) {
      console.log('No online pullers available');
      return;
    }

    // Calculate distance for each puller and sort by proximity
    const pullersWithDistance = onlinePullers
      .filter((puller) => puller.lastKnownLat && puller.lastKnownLon)
      .map((puller) => ({
        puller,
        distance: this.calculateHaversineDistance(
          puller.lastKnownLat,
          puller.lastKnownLon,
          ride.startBlock.latitude,
          ride.startBlock.longitude,
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    console.log(
      `📢 Distributing ride ${ride.id} to ${pullersWithDistance.length} online pullers via MQTT`,
    );

    // Notify top N closest pullers via MQTT
    const maxPullersToNotify = 10;
    const pullersToNotify = pullersWithDistance.slice(0, maxPullersToNotify);

    pullersToNotify.forEach(({ puller, distance }) => {
      // Create ride request payload
      const rideRequest = {
        rideId: ride.id,
        pickupBlock: {
          blockId: ride.startBlock.blockId,
          name: ride.startBlock.destinationName,
          centerLat: ride.startBlock.latitude,
          centerLon: ride.startBlock.longitude,
        },
        destinationBlock: {
          blockId: ride.destinationBlock.blockId,
          name: ride.destinationBlock.destinationName,
          centerLat: ride.destinationBlock.latitude,
          centerLon: ride.destinationBlock.longitude,
        },
        estimatedPoints: this.calculateEstimatedPoints(distance),
        distance: Math.round(distance),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        timestamp: new Date(),
      };

      // Publish to MQTT topic for specific puller
      this.mqttController.publish(`aeras/pullers/${puller.id}/ride-request`, rideRequest);

      console.log(
        `  📡 Published ride request to puller ${puller.id} (${puller.name}) - ${Math.round(distance)}m away`,
      );
    });
  }

  /**
   * Calculate estimated points based on distance
   */
  private calculateEstimatedPoints(distanceInMeters: number): number {
    const basePoints = 10;
    const distancePenalty = Math.floor(distanceInMeters / 100); // -1 point per 100m
    return Math.max(5, basePoints - distancePenalty); // Minimum 5 points
  }

  /**
   * Haversine formula to calculate distance between two coordinates
   * Returns distance in meters
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Accept a ride by a puller
   */
  async acceptRide(rideId: number, pullerId: string): Promise<Ride> {
    const ride = await this.ridesRepository.findOne({
      where: { id: rideId },
      relations: ['startBlock', 'destinationBlock', 'puller'],
    });

    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found`);
    }

    if (ride.status !== RideStatus.SEARCHING) {
      throw new BadRequestException(`Ride ${rideId} is not in SEARCHING status`);
    }

    const puller = await this.pullersRepository.findOne({
      where: { id: parseInt(pullerId) },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    ride.puller = puller;
    ride.status = RideStatus.ACCEPTED;
    ride.acceptTime = new Date();

    const savedRide = await this.ridesRepository.save(ride);

    // Get all online pullers to notify them this ride is no longer available
    const onlinePullers = await this.pullersRepository.find({
      where: { isOnline: true, isActive: true },
    });

    // Publish ride filled notification to MQTT
    // Other pullers listening to ride status will know it's no longer available
    this.mqttController.publish(`aeras/rides/${ride.id}/filled`, {
      rideId: ride.id,
      pullerId: puller.id,
      pullerName: puller.name,
      status: RideStatus.ACCEPTED,
      timestamp: new Date(),
    });
    console.log(`� Published ride ${ride.id} filled notification to MQTT`);

    // Broadcast ride status update to admin dashboard
    this.notificationsGateway.broadcastRideStatusUpdate(savedRide);

    // Publish to MQTT topic
    this.mqttController.publishRideStatus(savedRide.id, savedRide.status);
    console.log(`📡 Published ride ${savedRide.id} status to MQTT: ACCEPTED by puller ${pullerId}`);

    return savedRide;
  }

  /**
   * Reject a ride by a puller
   * Tracks the rejection and redistributes to other available pullers
   */
  async rejectRide(
    rideId: number,
    pullerId: string,
  ): Promise<{ success: boolean; message: string }> {
    const ride = await this.ridesRepository.findOne({
      where: { id: rideId },
      relations: ['startBlock', 'destinationBlock', 'puller'],
    });

    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found`);
    }

    if (ride.status !== RideStatus.SEARCHING) {
      throw new BadRequestException(`Ride ${rideId} is not in SEARCHING status`);
    }

    const puller = await this.pullersRepository.findOne({
      where: { id: parseInt(pullerId) },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    // Track this puller as having rejected the ride
    if (!ride.rejectedByPullers) {
      ride.rejectedByPullers = [];
    }

    if (!ride.rejectedByPullers.includes(puller.id)) {
      ride.rejectedByPullers.push(puller.id);
      await this.ridesRepository.save(ride);

      // Broadcast ride status update to admin dashboard (with rejectedByPullers info)
      this.notificationsGateway.broadcastRideStatusUpdate(ride);
      console.log(`📢 Broadcasted ride ${ride.id} rejection by puller ${pullerId}`);

      // Publish rejection to MQTT for puller confirmation
      this.mqttController.publish(`aeras/pullers/${pullerId}/ride-rejected`, {
        rideId: ride.id,
        message: 'Ride rejection recorded',
        timestamp: new Date(),
      });
      console.log(`📡 Published ride rejection confirmation to puller ${pullerId}`);

      // Find next available puller and send them the request
      await this.redistributeRideToNextPuller(ride);

      return {
        success: true,
        message: 'Ride rejection recorded successfully',
      };
    }

    return {
      success: true,
      message: 'Ride already rejected by this puller',
    };
  }

  /**
   * Redistribute ride to the next available puller who hasn't rejected it
   */
  private async redistributeRideToNextPuller(ride: Ride): Promise<void> {
    const onlinePullers = await this.pullersRepository.find({
      where: { isOnline: true, isActive: true },
    });

    if (onlinePullers.length === 0) {
      console.log('No online pullers available for redistribution');
      return;
    }

    // Filter out pullers who have already rejected this ride
    const rejectedIds = ride.rejectedByPullers || [];
    const availablePullers = onlinePullers.filter(
      (puller) => puller.lastKnownLat && puller.lastKnownLon && !rejectedIds.includes(puller.id),
    );

    if (availablePullers.length === 0) {
      console.log('No available pullers left for this ride');
      // Could set ride to EXPIRED here if desired
      return;
    }

    // Calculate distance and find the closest puller
    const pullersWithDistance = availablePullers
      .map((puller) => ({
        puller,
        distance: this.calculateHaversineDistance(
          puller.lastKnownLat,
          puller.lastKnownLon,
          ride.startBlock.latitude,
          ride.startBlock.longitude,
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (pullersWithDistance.length > 0) {
      const nextPuller = pullersWithDistance[0].puller;

      // Create ride request payload
      const rideRequest = {
        rideId: ride.id,
        pickupBlock: {
          blockId: ride.startBlock.blockId,
          name: ride.startBlock.destinationName,
          centerLat: ride.startBlock.latitude,
          centerLon: ride.startBlock.longitude,
        },
        destinationBlock: {
          blockId: ride.destinationBlock.blockId,
          name: ride.destinationBlock.destinationName,
          centerLat: ride.destinationBlock.latitude,
          centerLon: ride.destinationBlock.longitude,
        },
        estimatedPoints: 10,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        timestamp: new Date(),
      };

      // Publish to MQTT for next puller
      this.mqttController.publish(`aeras/pullers/${nextPuller.id}/ride-request`, rideRequest);
      console.log(`📡 Redistributed ride ${ride.id} to puller ${nextPuller.id} via MQTT`);
    }
  }

  /**
   * Mark ride as picked up (ACTIVE status)
   */
  async pickupRide(rideId: number): Promise<Ride> {
    const ride = await this.ridesRepository.findOne({
      where: { id: rideId },
      relations: ['startBlock', 'destinationBlock', 'puller'],
    });

    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found`);
    }

    if (ride.status !== RideStatus.ACCEPTED) {
      throw new BadRequestException(`Ride ${rideId} is not in ACCEPTED status`);
    }

    ride.status = RideStatus.ACTIVE;
    ride.pickupTime = new Date();

    const savedRide = await this.ridesRepository.save(ride);

    // Broadcast ride status update to admin dashboard
    this.notificationsGateway.broadcastRideStatusUpdate(savedRide);
    console.log(`📢 Broadcasted ride ${savedRide.id} status change to ACTIVE`);

    // Publish to MQTT topic
    this.mqttController.publishRideStatus(savedRide.id, savedRide.status);
    console.log(`📡 Published ride ${savedRide.id} status to MQTT: ACTIVE`);

    return savedRide;
  }

  /**
   * Complete a ride and allocate points to the puller
   * Uses database transaction to ensure data consistency
   */
  async completeRide(rideId: number, finalLat: number, finalLon: number): Promise<Ride> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ride = await queryRunner.manager.findOne(Ride, {
        where: { id: rideId },
        relations: ['startBlock', 'destinationBlock', 'puller'],
      });

      if (!ride) {
        throw new NotFoundException(`Ride ${rideId} not found`);
      }

      if (ride.status !== RideStatus.ACTIVE) {
        throw new BadRequestException(`Ride ${rideId} is not in ACTIVE status`);
      }

      if (!ride.puller) {
        throw new BadRequestException(`Ride ${rideId} has no assigned puller`);
      }

      // Calculate points based on distance from destination
      const distanceFromDestination = this.calculateHaversineDistance(
        finalLat,
        finalLon,
        ride.destinationBlock.latitude,
        ride.destinationBlock.longitude,
      );

      // Point allocation formula: Base Points (10) - (Distance_in_meters / 10)
      const basePoints = 10;
      const calculatedPoints = Math.max(0, Math.floor(basePoints - distanceFromDestination / 10));

      // Update ride
      ride.status = RideStatus.COMPLETED;
      ride.completionTime = new Date();
      ride.pointsAwarded = calculatedPoints;
      await queryRunner.manager.save(Ride, ride);

      // Update puller's points balance
      ride.puller.pointsBalance += calculatedPoints;
      await queryRunner.manager.save(Puller, ride.puller);

      // Create points history record
      const pointsHistory = queryRunner.manager.create(PointsHistory, {
        puller: ride.puller,
        ride: ride,
        pointsChange: calculatedPoints,
        reason: PointReason.RIDE_COMPLETION,
      });
      await queryRunner.manager.save(PointsHistory, pointsHistory);

      await queryRunner.commitTransaction();

      // Broadcast ride status update to admin dashboard
      this.notificationsGateway.broadcastRideStatusUpdate(ride);
      console.log(`📢 Broadcasted ride ${ride.id} completion to admin dashboard`);

      // Publish to MQTT topic
      this.mqttController.publishRideStatus(ride.id, ride.status);
      const completionPayload = {
        rideId: ride.id,
        status: ride.status,
        pointsAwarded: calculatedPoints,
        pullerId: ride.puller.id,
        distanceFromDestination: Math.round(distanceFromDestination),
        timestamp: new Date(),
      };
      this.mqttController.publish(`aeras/rides/${ride.id}/completed`, completionPayload);
      console.log(
        `📡 Published ride ${ride.id} completion to MQTT with ${calculatedPoints} points`,
      );

      return ride;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all rides with optional filtering
   */
  async getAllRides(
    status?: RideStatus,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ rides: Ride[]; total: number }> {
    // Ensure page and limit are numbers
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const query = this.ridesRepository
      .createQueryBuilder('ride')
      .leftJoinAndSelect('ride.startBlock', 'startBlock')
      .leftJoinAndSelect('ride.destinationBlock', 'destinationBlock')
      .leftJoinAndSelect('ride.puller', 'puller')
      .orderBy('ride.requestTime', 'DESC');

    if (status) {
      query.where('ride.status = :status', { status });
    }

    const [rides, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return { rides, total };
  }

  /**
   * Get a single ride by ID
   */
  async getRideById(rideId: number): Promise<Ride> {
    const ride = await this.ridesRepository.findOne({
      where: { id: rideId },
      relations: ['startBlock', 'destinationBlock', 'puller'],
    });

    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found`);
    }

    return ride;
  }

  /**
   * Adjust points for a ride (admin action)
   */
  async adjustRidePoints(rideId: number, pointsAdjustment: number, reason: string): Promise<Ride> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ride = await queryRunner.manager.findOne(Ride, {
        where: { id: rideId },
        relations: ['puller'],
      });

      if (!ride) {
        throw new NotFoundException(`Ride ${rideId} not found`);
      }

      if (!ride.puller) {
        throw new BadRequestException(`Ride ${rideId} has no assigned puller`);
      }

      // Update ride points
      const oldPoints = ride.pointsAwarded || 0;
      ride.pointsAwarded = oldPoints + pointsAdjustment;
      await queryRunner.manager.save(Ride, ride);

      // Update puller points balance
      ride.puller.pointsBalance += pointsAdjustment;
      await queryRunner.manager.save(Puller, ride.puller);

      // Create points history record
      const pointsHistory = queryRunner.manager.create(PointsHistory, {
        puller: ride.puller,
        ride: ride,
        pointsChange: pointsAdjustment,
        reason: PointReason.MANUAL_ADJUSTMENT,
      });
      await queryRunner.manager.save(PointsHistory, pointsHistory);

      await queryRunner.commitTransaction();

      return ride;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
