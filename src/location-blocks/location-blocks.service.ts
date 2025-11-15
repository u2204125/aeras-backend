import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationBlock } from '../entities/location-block.entity';
import { CreateLocationBlockDto, UpdateLocationBlockDto } from './dto/location-block.dto';

/**
 * LocationBlocksService
 * Handles all business logic for location block management
 */
@Injectable()
export class LocationBlocksService {
  constructor(
    @InjectRepository(LocationBlock)
    private locationBlocksRepository: Repository<LocationBlock>,
  ) {}

  /**
   * Get all location blocks with optional filtering and pagination
   */
  async getAllLocationBlocks(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: LocationBlock[]; total: number; page: number; limit: number }> {
    const query = this.locationBlocksRepository.createQueryBuilder('block');

    if (search) {
      query.andWhere('(block.blockId LIKE :search OR block.destinationName LIKE :search)', {
        search: `%${search}%`,
      });
    }

    query.orderBy('block.destinationName', 'ASC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get location block by ID
   */
  async getLocationBlockById(id: number): Promise<LocationBlock> {
    const locationBlock = await this.locationBlocksRepository.findOne({
      where: { id },
      relations: ['ridesStarting', 'ridesEnding'],
    });

    if (!locationBlock) {
      throw new NotFoundException(`Location block ${id} not found`);
    }

    return locationBlock;
  }

  /**
   * Get location block by blockId
   */
  async getLocationBlockByBlockId(blockId: string): Promise<LocationBlock> {
    const locationBlock = await this.locationBlocksRepository.findOne({
      where: { blockId },
    });

    if (!locationBlock) {
      throw new NotFoundException(`Location block with ID ${blockId} not found`);
    }

    return locationBlock;
  }

  /**
   * Create a new location block
   */
  async createLocationBlock(
    createLocationBlockDto: CreateLocationBlockDto,
  ): Promise<LocationBlock> {
    // Check if blockId already exists
    const existingBlock = await this.locationBlocksRepository.findOne({
      where: { blockId: createLocationBlockDto.blockId },
    });

    if (existingBlock) {
      throw new ConflictException(
        `Location block with ID ${createLocationBlockDto.blockId} already exists`,
      );
    }

    const locationBlock = this.locationBlocksRepository.create(createLocationBlockDto);
    return this.locationBlocksRepository.save(locationBlock);
  }

  /**
   * Update a location block
   */
  async updateLocationBlock(
    id: number,
    updateLocationBlockDto: UpdateLocationBlockDto,
  ): Promise<LocationBlock> {
    const locationBlock = await this.locationBlocksRepository.findOne({
      where: { id },
    });

    if (!locationBlock) {
      throw new NotFoundException(`Location block ${id} not found`);
    }

    // If blockId is being updated, check for conflicts
    if (
      updateLocationBlockDto.blockId &&
      updateLocationBlockDto.blockId !== locationBlock.blockId
    ) {
      const existingBlock = await this.locationBlocksRepository.findOne({
        where: { blockId: updateLocationBlockDto.blockId },
      });

      if (existingBlock) {
        throw new ConflictException(
          `Location block with ID ${updateLocationBlockDto.blockId} already exists`,
        );
      }
    }

    Object.assign(locationBlock, updateLocationBlockDto);

    return this.locationBlocksRepository.save(locationBlock);
  }

  /**
   * Delete a location block
   */
  async deleteLocationBlock(id: number): Promise<void> {
    const locationBlock = await this.locationBlocksRepository.findOne({
      where: { id },
      relations: ['ridesStarting', 'ridesEnding'],
    });

    if (!locationBlock) {
      throw new NotFoundException(`Location block ${id} not found`);
    }

    // Check if location block has any associated rides
    if (
      (locationBlock.ridesStarting && locationBlock.ridesStarting.length > 0) ||
      (locationBlock.ridesEnding && locationBlock.ridesEnding.length > 0)
    ) {
      throw new ConflictException(`Cannot delete location block with associated rides`);
    }

    await this.locationBlocksRepository.remove(locationBlock);
  }
}
