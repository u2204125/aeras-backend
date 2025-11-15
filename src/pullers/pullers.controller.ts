import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
  Patch,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PullersService } from './pullers.service';
import { UpdateLocationDto, CreatePullerDto, UpdatePullerDto } from './dto/puller.dto';
import { Puller } from '../entities/puller.entity';

/**
 * PullersController
 * Handles all HTTP endpoints for puller management
 */
@ApiTags('Pullers')
@Controller('pullers')
export class PullersController {
  constructor(private readonly pullersService: PullersService) {}

  /**
   * GET /pullers
   * Get all pullers with optional filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get all pullers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'online', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Pullers retrieved successfully' })
  async getAllPullers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('online') online?: boolean,
  ): Promise<any> {
    return this.pullersService.getAllPullers(page, limit, search, online);
  }

  /**
   * POST /pullers
   * Create a new puller
   */
  @Post()
  @ApiOperation({ summary: 'Create a new puller' })
  @ApiBody({ type: CreatePullerDto })
  @ApiResponse({ status: 201, description: 'Puller created successfully' })
  @ApiResponse({ status: 409, description: 'Puller with this phone already exists' })
  async createPuller(@Body() createPullerDto: CreatePullerDto): Promise<Puller> {
    return this.pullersService.createPuller(createPullerDto);
  }

  /**
   * GET /pullers/online
   * Get all online pullers
   */
  @Get('online')
  @ApiOperation({ summary: 'Get all online pullers' })
  @ApiResponse({ status: 200, description: 'Online pullers retrieved successfully' })
  async getOnlinePullers(): Promise<Puller[]> {
    return this.pullersService.getOnlinePullers();
  }

  /**
   * POST /pullers/:id/location
   * Update a puller's location
   */
  @Post(':id/location')
  @ApiOperation({ summary: 'Update puller location' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<Puller> {
    return this.pullersService.updateLocation(id, updateLocationDto.lat, updateLocationDto.lon);
  }

  /**
   * GET /pullers/:id/requests
   * Get prioritized list of available ride requests for a puller
   */
  @Get(':id/requests')
  @ApiOperation({ summary: 'Get available ride requests for a puller' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Ride requests retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async getRideRequests(@Param('id', ParseIntPipe) id: number): Promise<any[]> {
    return this.pullersService.getRideRequestsForPuller(id);
  }

  /**
   * GET /pullers/:id
   * Get puller by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get puller by ID' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Puller retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async getPullerById(@Param('id', ParseIntPipe) id: number): Promise<Puller> {
    return this.pullersService.getPullerById(id);
  }

  /**
   * PUT /pullers/:id
   * Update a puller
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a puller' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiBody({ type: UpdatePullerDto })
  @ApiResponse({ status: 200, description: 'Puller updated successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  @ApiResponse({ status: 409, description: 'Phone number already in use' })
  async updatePuller(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePullerDto: UpdatePullerDto,
  ): Promise<Puller> {
    return this.pullersService.updatePuller(id, updatePullerDto);
  }

  /**
   * DELETE /pullers/:id
   * Delete a puller
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a puller' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 204, description: 'Puller deleted successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete puller with existing rides' })
  async deletePuller(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.pullersService.deletePuller(id);
  }

  /**
   * POST /pullers/:id/online
   * Set puller online status
   */
  @Post(':id/online')
  @ApiOperation({ summary: 'Set puller online' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Puller set to online' })
  async setOnline(@Param('id', ParseIntPipe) id: number): Promise<Puller> {
    return this.pullersService.setOnlineStatus(id, true);
  }

  /**
   * POST /pullers/:id/offline
   * Set puller offline status
   */
  @Post(':id/offline')
  @ApiOperation({ summary: 'Set puller offline' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Puller set to offline' })
  async setOffline(@Param('id', ParseIntPipe) id: number): Promise<Puller> {
    return this.pullersService.setOnlineStatus(id, false);
  }

  /**
   * GET /pullers/:id/rides
   * Get ride history for a puller
   */
  @Get(':id/rides')
  @ApiOperation({ summary: 'Get puller ride history' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Ride history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async getPullerRides(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.pullersService.getPullerRides(id, page, limit);
  }

  /**
   * PATCH /pullers/:id/points
   * Adjust puller points
   */
  @Patch(':id/points')
  @ApiOperation({ summary: 'Adjust puller points' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Points adjusted successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async adjustPoints(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { points: number; reason: string },
  ): Promise<Puller> {
    return this.pullersService.adjustPoints(id, body.points, body.reason);
  }

  /**
   * POST /pullers/:id/suspend
   * Suspend a puller
   */
  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend a puller' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Puller suspended successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async suspendPuller(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
  ): Promise<Puller> {
    return this.pullersService.suspendPuller(id, body.reason);
  }

  /**
   * POST /pullers/:id/unsuspend
   * Unsuspend (reactivate) a puller
   */
  @Post(':id/unsuspend')
  @ApiOperation({ summary: 'Unsuspend a puller' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Puller unsuspended successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async unsuspendPuller(@Param('id', ParseIntPipe) id: number): Promise<Puller> {
    return this.pullersService.unsuspendPuller(id);
  }
}
