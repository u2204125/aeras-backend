import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Puller } from '../entities/puller.entity';
import { Ride, RideStatus } from '../rides/ride.entity';
import { PointsHistory, PointReason } from '../entities/points-history.entity';
import { CreatePullerDto, UpdatePullerDto } from './dto/puller.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

/**
 * PullersService
 * Handles all business logic for puller management
 */
@Injectable()
export class PullersService {
  constructor(
    @InjectRepository(Puller)
    private pullersRepository: Repository<Puller>,
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Get all online pullers
   */
  async getOnlinePullers(): Promise<Puller[]> {
    return this.pullersRepository.find({
      where: { isOnline: true, isActive: true },
    });
  }

  /**
   * Update a puller's location
   */
  async updateLocation(pullerId: number, lat: number, lon: number): Promise<Puller> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    puller.lastKnownLat = lat;
    puller.lastKnownLon = lon;

    return this.pullersRepository.save(puller);
  }

  /**
   * Get prioritized list of available ride requests for a puller
   * Orders by distance from puller's current location
   */
  async getRideRequestsForPuller(pullerId: number): Promise<any[]> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    if (!puller.lastKnownLat || !puller.lastKnownLon) {
      return [];
    }

    // Get all rides in SEARCHING status
    const availableRides = await this.ridesRepository.find({
      where: { status: RideStatus.SEARCHING },
      relations: ['startBlock', 'destinationBlock'],
    });

    // Calculate distance and sort by proximity
    const ridesWithDistance = availableRides
      .map((ride) => ({
        ride,
        distance: this.getDistance(
          puller.lastKnownLat,
          puller.lastKnownLon,
          ride.startBlock.latitude,
          ride.startBlock.longitude,
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    return ridesWithDistance;
  }

  /**
   * Haversine distance calculation helper function
   * Returns distance in meters
   */
  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
   * Get puller by ID
   */
  async getPullerById(pullerId: number): Promise<Puller> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
      relations: ['rides', 'pointsHistory'],
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    return puller;
  }

  /**
   * Set puller online/offline status
   */
  async setOnlineStatus(pullerId: number, isOnline: boolean): Promise<Puller> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    puller.isOnline = isOnline;
    const savedPuller = await this.pullersRepository.save(puller);

    // Broadcast status update to all connected clients (admin dashboard, etc.)
    this.notificationsGateway.broadcastPullerStatusUpdate(pullerId, isOnline);

    return savedPuller;
  }

  /**
   * Get all pullers with optional filtering and pagination
   */
  async getAllPullers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    online?: boolean,
  ): Promise<{ data: Puller[]; total: number; page: number; limit: number }> {
    const query = this.pullersRepository.createQueryBuilder('puller');

    if (search) {
      query.andWhere('(puller.name LIKE :search OR puller.phoneNumber LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (online !== undefined) {
      query.andWhere('puller.isOnline = :online', { online });
    }

    query.orderBy('puller.pointsBalance', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get ride history for a puller
   */
  async getPullerRides(
    pullerId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Ride[]; total: number }> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    const [data, total] = await this.ridesRepository.findAndCount({
      where: { puller: { id: pullerId } },
      relations: ['startBlock', 'destinationBlock'],
      order: { requestTime: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  /**
   * Adjust puller points
   */
  async adjustPoints(pullerId: number, points: number, reason: string): Promise<Puller> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const puller = await queryRunner.manager.findOne(Puller, {
        where: { id: pullerId },
      });

      if (!puller) {
        throw new NotFoundException(`Puller ${pullerId} not found`);
      }

      // Update puller's points balance
      puller.pointsBalance += points;
      await queryRunner.manager.save(Puller, puller);

      // Create points history record
      const pointsHistory = queryRunner.manager.create(PointsHistory, {
        puller: puller,
        pointsChange: points,
        reason: PointReason.MANUAL_ADJUSTMENT,
      });
      await queryRunner.manager.save(PointsHistory, pointsHistory);

      await queryRunner.commitTransaction();

      return puller;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Suspend a puller
   */
  async suspendPuller(pullerId: number, reason: string): Promise<Puller> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    puller.isActive = false;
    puller.isOnline = false;
    // Note: You may want to add a suspensionReason field to the Puller entity

    return this.pullersRepository.save(puller);
  }

  /**
   * Unsuspend (reactivate) a puller
   */
  async unsuspendPuller(pullerId: number): Promise<Puller> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    puller.isActive = true;

    return this.pullersRepository.save(puller);
  }

  /**
   * Create a new puller
   */
  async createPuller(createPullerDto: CreatePullerDto): Promise<Puller> {
    // Check if phone number already exists
    const existingPuller = await this.pullersRepository.findOne({
      where: { phone: createPullerDto.phone },
    });

    if (existingPuller) {
      throw new ConflictException(`Puller with phone ${createPullerDto.phone} already exists`);
    }

    const puller = this.pullersRepository.create({
      ...createPullerDto,
      pointsBalance: createPullerDto.pointsBalance ?? 0,
      isActive: createPullerDto.isActive ?? true,
      isOnline: false,
    });

    return this.pullersRepository.save(puller);
  }

  /**
   * Update a puller
   */
  async updatePuller(pullerId: number, updatePullerDto: UpdatePullerDto): Promise<Puller> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    // If phone is being updated, check for conflicts
    if (updatePullerDto.phone && updatePullerDto.phone !== puller.phone) {
      const existingPuller = await this.pullersRepository.findOne({
        where: { phone: updatePullerDto.phone },
      });

      if (existingPuller) {
        throw new ConflictException(`Puller with phone ${updatePullerDto.phone} already exists`);
      }
    }

    Object.assign(puller, updatePullerDto);

    return this.pullersRepository.save(puller);
  }

  /**
   * Delete a puller
   */
  async deletePuller(pullerId: number): Promise<void> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
      relations: ['rides'],
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    // Check if puller has any rides
    if (puller.rides && puller.rides.length > 0) {
      throw new ConflictException(
        `Cannot delete puller with existing ride history. Consider suspending instead.`,
      );
    }

    await this.pullersRepository.remove(puller);
  }
}
