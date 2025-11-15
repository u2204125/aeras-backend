import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { LocationBlocksService } from './location-blocks.service';
import { CreateLocationBlockDto, UpdateLocationBlockDto } from './dto/location-block.dto';
import { LocationBlock } from '../entities/location-block.entity';

/**
 * LocationBlocksController
 * Handles all HTTP endpoints for location block management
 */
@ApiTags('Location Blocks')
@Controller('location-blocks')
export class LocationBlocksController {
  constructor(private readonly locationBlocksService: LocationBlocksService) {}

  /**
   * GET /location-blocks
   * Get all location blocks with optional filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get all location blocks with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Location blocks retrieved successfully' })
  async getAllLocationBlocks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.locationBlocksService.getAllLocationBlocks(page, limit, search);
  }

  /**
   * POST /location-blocks
   * Create a new location block
   */
  @Post()
  @ApiOperation({ summary: 'Create a new location block' })
  @ApiBody({ type: CreateLocationBlockDto })
  @ApiResponse({ status: 201, description: 'Location block created successfully' })
  @ApiResponse({ status: 409, description: 'Location block with this ID already exists' })
  async createLocationBlock(
    @Body() createLocationBlockDto: CreateLocationBlockDto,
  ): Promise<LocationBlock> {
    return this.locationBlocksService.createLocationBlock(createLocationBlockDto);
  }

  /**
   * GET /location-blocks/:id
   * Get location block by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get location block by ID' })
  @ApiParam({ name: 'id', description: 'Location block ID' })
  @ApiResponse({ status: 200, description: 'Location block retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Location block not found' })
  async getLocationBlockById(@Param('id', ParseIntPipe) id: number): Promise<LocationBlock> {
    return this.locationBlocksService.getLocationBlockById(id);
  }

  /**
   * PUT /location-blocks/:id
   * Update a location block
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a location block' })
  @ApiParam({ name: 'id', description: 'Location block ID' })
  @ApiBody({ type: UpdateLocationBlockDto })
  @ApiResponse({ status: 200, description: 'Location block updated successfully' })
  @ApiResponse({ status: 404, description: 'Location block not found' })
  @ApiResponse({ status: 409, description: 'Block ID already in use' })
  async updateLocationBlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationBlockDto: UpdateLocationBlockDto,
  ): Promise<LocationBlock> {
    return this.locationBlocksService.updateLocationBlock(id, updateLocationBlockDto);
  }

  /**
   * DELETE /location-blocks/:id
   * Delete a location block
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a location block' })
  @ApiParam({ name: 'id', description: 'Location block ID' })
  @ApiResponse({ status: 204, description: 'Location block deleted successfully' })
  @ApiResponse({ status: 404, description: 'Location block not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete location block with associated rides' })
  async deleteLocationBlock(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.locationBlocksService.deleteLocationBlock(id);
  }
}
