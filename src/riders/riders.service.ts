import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rider } from '../entities/rider.entity';
import { Ride } from '../rides/ride.entity';
import { CreateRiderDto, UpdateRiderDto } from './dto/rider.dto';

/**
 * RidersService
 * Handles all business logic for rider management
 */
@Injectable()
export class RidersService {
  constructor(
    @InjectRepository(Rider)
    private ridersRepository: Repository<Rider>,
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
  ) {}

  /**
   * Get all riders with optional filtering and pagination
   */
  async getAllRiders(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: Rider[]; total: number; page: number; limit: number }> {
    const query = this.ridersRepository.createQueryBuilder('rider');

    if (search) {
      query.andWhere(
        '(rider.name LIKE :search OR rider.phone LIKE :search OR rider.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    query.orderBy('rider.createdAt', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get rider by ID
   */
  async getRiderById(id: number): Promise<Rider> {
    const rider = await this.ridersRepository.findOne({
      where: { id },
      relations: ['rides'],
    });

    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`);
    }

    return rider;
  }

  /**
   * Create a new rider
   */
  async createRider(createRiderDto: CreateRiderDto): Promise<Rider> {
    // Check if phone number already exists
    const existingRider = await this.ridersRepository.findOne({
      where: { phone: createRiderDto.phone },
    });

    if (existingRider) {
      throw new ConflictException(`Rider with phone ${createRiderDto.phone} already exists`);
    }

    const rider = this.ridersRepository.create({
      ...createRiderDto,
      isActive: createRiderDto.isActive ?? true,
      totalRides: 0,
    });

    return this.ridersRepository.save(rider);
  }

  /**
   * Update a rider
   */
  async updateRider(id: number, updateRiderDto: UpdateRiderDto): Promise<Rider> {
    const rider = await this.ridersRepository.findOne({
      where: { id },
    });

    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`);
    }

    // If phone is being updated, check for conflicts
    if (updateRiderDto.phone && updateRiderDto.phone !== rider.phone) {
      const existingRider = await this.ridersRepository.findOne({
        where: { phone: updateRiderDto.phone },
      });

      if (existingRider) {
        throw new ConflictException(`Rider with phone ${updateRiderDto.phone} already exists`);
      }
    }

    Object.assign(rider, updateRiderDto);

    return this.ridersRepository.save(rider);
  }

  /**
   * Delete a rider
   */
  async deleteRider(id: number): Promise<void> {
    const rider = await this.ridersRepository.findOne({
      where: { id },
      relations: ['rides'],
    });

    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`);
    }

    // Check if rider has any rides
    if (rider.rides && rider.rides.length > 0) {
      throw new ConflictException(
        `Cannot delete rider with existing ride history. Consider deactivating instead.`,
      );
    }

    await this.ridersRepository.remove(rider);
  }

  /**
   * Get ride history for a rider
   */
  async getRiderRides(
    riderId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Ride[]; total: number }> {
    const rider = await this.ridersRepository.findOne({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException(`Rider ${riderId} not found`);
    }

    const [data, total] = await this.ridesRepository.findAndCount({
      where: { rider: { id: riderId } },
      relations: ['startBlock', 'destinationBlock', 'puller'],
      order: { requestTime: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }
}
