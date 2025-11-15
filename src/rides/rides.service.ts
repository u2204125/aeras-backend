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

    return savedRide;
  }

  /**
   * Create ride directly from hardware with both start and destination blocks
   * Called when IoT hardware sends ride request with complete data
   * Immediately sets status to SEARCHING and distributes to nearby pullers
   * Sets auto-expiration timeout for 1 minute
   */
  async createRideFromHardware(startBlockId: string, destinationBlockId: string): Promise<Ride> {
    // Find start block
    const startBlock = await this.locationBlocksRepository.findOne({
      where: { blockId: startBlockId },
    });

    if (!startBlock) {
      throw new NotFoundException(`Start block ${startBlockId} not found`);
    }

    // Find destination block
    const destinationBlock = await this.locationBlocksRepository.findOne({
      where: { blockId: destinationBlockId },
    });

    if (!destinationBlock) {
      throw new NotFoundException(`Destination block ${destinationBlockId} not found`);
    }

    // Create ride directly in SEARCHING status
    const ride = this.ridesRepository.create({
      startBlock,
      destinationBlock,
      status: RideStatus.SEARCHING,
      requestTime: new Date(),
    });

    const savedRide = await this.ridesRepository.save(ride);

    console.log(`🚗 Ride ${savedRide.id} created: ${startBlock.destinationName} → ${destinationBlock.destinationName}`);

    // Broadcast to admin dashboard via WebSocket
    this.notificationsGateway.broadcastRideStatusUpdate(savedRide);
    console.log(`📢 Broadcasted ride ${savedRide.id} to admin dashboard`);

    // Publish to MQTT for hardware confirmation
    // this.mqttController.publishRideStatus(savedRide.id, savedRide.status, {
    //   startBlock: { blockId: startBlock.blockId, name: startBlock.destinationName },
    //   destinationBlock: { blockId: destinationBlock.blockId, name: destinationBlock.destinationName },
    // });

    // Distribute to nearby pullers via MQTT and WebSocket
    await this.distributeRideToNearbyPullers(savedRide);

    // Set auto-expiration timeout for 1 minute (60000 ms)
    setTimeout(async () => {
      await this.autoExpireRide(savedRide.id);
    }, 60000);

    console.log(`⏰ Auto-expiration timer set for ride ${savedRide.id} (1 minute)`);

    return savedRide;
  }

  /**
   * Confirm a pending ride and change status to SEARCHING
   * Triggers ride distribution to nearby pullers
   */
  async confirmRide(rideId: number, destinationBlockId: string): Promise<Ride> {
    const ride = await this.ridesRepository.findOne({
      where: {
        id: rideId,
        status: RideStatus.PENDING_USER_CONFIRMATION,
      },
      relations: ['startBlock', 'destinationBlock'],
    });

    if (!ride) {
      throw new NotFoundException(`No pending ride found with ID ${rideId}`);
    }

    // Find and update the destination block
    const destinationBlock = await this.locationBlocksRepository.findOne({
      where: { blockId: destinationBlockId },
    });

    if (!destinationBlock) {
      throw new NotFoundException(`Destination block ${destinationBlockId} not found`);
    }

    ride.destinationBlock = destinationBlock;
    ride.status = RideStatus.SEARCHING;
    const savedRide = await this.ridesRepository.save(ride);

    // Broadcast ride status update to admin dashboard
    this.notificationsGateway.broadcastRideStatusUpdate(savedRide);

    // Publish to MQTT topic
    this.mqttController.publishRideStatus(savedRide.id, savedRide.status);

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

      // Publish to MQTT topic for IoT hardware/devices
      this.mqttController.publishRideRequest(puller.id, rideRequest);

      // Also send via WebSocket to puller web app
      this.notificationsGateway.sendRideRequestToPuller(puller.id, rideRequest);
    });
  }

  /**
   * Auto-expire ride if not accepted within timeout period
   * Called by setTimeout after ride creation
   */
  private async autoExpireRide(rideId: number): Promise<void> {
    try {
      // Fetch the ride with current status
      const ride = await this.ridesRepository.findOne({
        where: { id: rideId },
        relations: ['startBlock', 'destinationBlock', 'puller'],
      });

      // Only expire if still in SEARCHING status (not yet accepted)
      if (!ride) {
        console.log(`⚠️  Ride ${rideId} not found for auto-expiration`);
        return;
      }

      if (ride.status !== RideStatus.SEARCHING) {
        console.log(`✓ Ride ${rideId} already ${ride.status}, skipping auto-expiration`);
        return;
      }

      // Update ride status to EXPIRED
      ride.status = RideStatus.EXPIRED;
      const expiredRide = await this.ridesRepository.save(ride);

      console.log(`⏰ Ride ${rideId} auto-expired after 1 minute (no puller acceptance)`);

      // Broadcast to admin dashboard via WebSocket
      this.notificationsGateway.broadcastRideStatusUpdate(expiredRide);
      console.log(`📢 Broadcasted ride ${rideId} expiration to admin dashboard`);

      // Notify all nearby pullers that ride has expired via MQTT
      const onlinePullers = await this.pullersRepository.find({
        where: { isOnline: true, isActive: true },
      });

      onlinePullers.forEach((puller) => {
        this.mqttController.publishRideExpired(rideId, puller.id);
      });

      console.log(`📡 Published ride ${rideId} expiration to ${onlinePullers.length} pullers via MQTT`);

      // Publish to MQTT broker for hardware
      this.mqttController.publishRideStatus(rideId, RideStatus.EXPIRED, {
        reason: 'No puller accepted within 1 minute',
        startBlock: { 
          blockId: ride.startBlock.blockId, 
          name: ride.startBlock.destinationName 
        },
        destinationBlock: { 
          blockId: ride.destinationBlock.blockId, 
          name: ride.destinationBlock.destinationName 
        },
      });

      console.log(`📡 Published ride ${rideId} expiration to MQTT broker`);

    } catch (error) {
      console.error(`❌ Error auto-expiring ride ${rideId}:`, error);
    }
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

    // Publish ride filled notification to MQTT using new method
    this.mqttController.publishRideFilled(ride.id, puller.id, puller.name);

    // Broadcast ride filled to all pullers via WebSocket
    this.notificationsGateway.broadcastRideFilled(ride.id);

    // Broadcast ride status update to admin dashboard
    this.notificationsGateway.broadcastRideStatusUpdate(savedRide);

    // Publish to MQTT topic with puller information
    this.mqttController.publishRideStatus(savedRide.id, savedRide.status, {
      pullerId: puller.id,
      pullerName: puller.name,
    });

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

      // Publish rejection confirmation to MQTT for puller using new method
      this.mqttController.publishRideRejectionConfirmation(puller.id, ride.id);

      // Find next available puller and send them the request

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
      return;
    }

    // Filter out pullers who have already rejected this ride
    const rejectedIds = ride.rejectedByPullers || [];
    const availablePullers = onlinePullers.filter(
      (puller) => puller.lastKnownLat && puller.lastKnownLon && !rejectedIds.includes(puller.id),
    );

    if (availablePullers.length === 0) {
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

      // Publish to MQTT for next puller using new method
      this.mqttController.publishRideRequest(nextPuller.id, rideRequest);
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

    // Publish to MQTT topic
    this.mqttController.publishRideStatus(savedRide.id, savedRide.status);

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

      // Publish to MQTT topic
      this.mqttController.publishRideStatus(ride.id, ride.status);
      
      // Publish detailed completion notification to MQTT using new method
      this.mqttController.publishRideCompletion(
        ride.id,
        ride.puller.id,
        calculatedPoints,
        distanceFromDestination
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
