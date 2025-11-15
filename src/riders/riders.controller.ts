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
import { RidersService } from './riders.service';
import { CreateRiderDto, UpdateRiderDto } from './dto/rider.dto';
import { Rider } from '../entities/rider.entity';

/**
 * RidersController
 * Handles all HTTP endpoints for rider management
 */
@ApiTags('Riders')
@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  /**
   * GET /riders
   * Get all riders with optional filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get all riders with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Riders retrieved successfully' })
  async getAllRiders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.ridersService.getAllRiders(page, limit, search);
  }

  /**
   * POST /riders
   * Create a new rider
   */
  @Post()
  @ApiOperation({ summary: 'Create a new rider' })
  @ApiBody({ type: CreateRiderDto })
  @ApiResponse({ status: 201, description: 'Rider created successfully' })
  @ApiResponse({ status: 409, description: 'Rider with this phone already exists' })
  async createRider(@Body() createRiderDto: CreateRiderDto): Promise<Rider> {
    return this.ridersService.createRider(createRiderDto);
  }

  /**
   * GET /riders/:id
   * Get rider by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get rider by ID' })
  @ApiParam({ name: 'id', description: 'Rider ID' })
  @ApiResponse({ status: 200, description: 'Rider retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  async getRiderById(@Param('id', ParseIntPipe) id: number): Promise<Rider> {
    return this.ridersService.getRiderById(id);
  }

  /**
   * PUT /riders/:id
   * Update a rider
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a rider' })
  @ApiParam({ name: 'id', description: 'Rider ID' })
  @ApiBody({ type: UpdateRiderDto })
  @ApiResponse({ status: 200, description: 'Rider updated successfully' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  @ApiResponse({ status: 409, description: 'Phone number already in use' })
  async updateRider(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRiderDto: UpdateRiderDto,
  ): Promise<Rider> {
    return this.ridersService.updateRider(id, updateRiderDto);
  }

  /**
   * DELETE /riders/:id
   * Delete a rider
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rider' })
  @ApiParam({ name: 'id', description: 'Rider ID' })
  @ApiResponse({ status: 204, description: 'Rider deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete rider with existing rides' })
  async deleteRider(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ridersService.deleteRider(id);
  }

  /**
   * GET /riders/:id/rides
   * Get ride history for a rider
   */
  @Get(':id/rides')
  @ApiOperation({ summary: 'Get rider ride history' })
  @ApiParam({ name: 'id', description: 'Rider ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Ride history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  async getRiderRides(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.ridersService.getRiderRides(id, page, limit);
  }
}
