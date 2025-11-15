import { Controller, Post, Get, Body, Param, ParseIntPipe, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RidesService } from './rides.service';
import {
  AcceptRideDto,
  CompleteRideDto,
  RejectRideDto,
} from './dto/ride.dto';
import { Ride, RideStatus } from './ride.entity';

/**
 * RidesController
 * Handles all HTTP endpoints for ride management
 * 
 * Note: Ride creation is handled by IoT hardware via MQTT (aeras/ride-request topic)
 * Hardware sends { startBlockId, destinationBlockId } and backend creates the ride
 */
@ApiTags('Rides')
@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  /**
   * POST /rides/:id/accept
   * Assign a puller to a ride and change status to ACCEPTED
   */
  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a ride as a puller' })
  @ApiParam({ name: 'id', description: 'Ride ID' })
  @ApiResponse({ status: 200, description: 'Ride accepted successfully' })
  @ApiResponse({ status: 404, description: 'Ride or puller not found' })
  @ApiResponse({ status: 400, description: 'Ride not in SEARCHING status' })
  async acceptRide(
    @Param('id', ParseIntPipe) id: number,
    @Body() acceptRideDto: AcceptRideDto,
  ): Promise<Ride> {
    return this.ridesService.acceptRide(id, acceptRideDto.pullerId);
  }

  /**
   * POST /rides/:id/reject
   * Reject a ride as a puller
   */
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a ride as a puller' })
  @ApiParam({ name: 'id', description: 'Ride ID' })
  @ApiResponse({ status: 200, description: 'Ride rejection recorded successfully' })
  @ApiResponse({ status: 404, description: 'Ride or puller not found' })
  @ApiResponse({ status: 400, description: 'Ride not in SEARCHING status' })
  async rejectRide(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectRideDto: RejectRideDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.ridesService.rejectRide(id, rejectRideDto.pullerId);
  }

  /**
   * POST /rides/:id/pickup
   * Mark ride as picked up (ACTIVE status)
   */
  @Post(':id/pickup')
  @ApiOperation({ summary: 'Mark ride as picked up' })
  @ApiParam({ name: 'id', description: 'Ride ID' })
  @ApiResponse({ status: 200, description: 'Ride marked as active' })
  @ApiResponse({ status: 404, description: 'Ride not found' })
  @ApiResponse({ status: 400, description: 'Ride not in ACCEPTED status' })
  async pickupRide(@Param('id', ParseIntPipe) id: number): Promise<Ride> {
    return this.ridesService.pickupRide(id);
  }

  /**
   * POST /rides/:id/complete
   * Complete a ride and allocate points
   */
  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a ride and allocate points' })
  @ApiParam({ name: 'id', description: 'Ride ID' })
  @ApiResponse({ status: 200, description: 'Ride completed successfully' })
  @ApiResponse({ status: 404, description: 'Ride not found' })
  @ApiResponse({ status: 400, description: 'Ride not in ACTIVE status' })
  async completeRide(
    @Param('id', ParseIntPipe) id: number,
    @Body() completeRideDto: CompleteRideDto,
  ): Promise<Ride> {
    return this.ridesService.completeRide(id, completeRideDto.finalLat, completeRideDto.finalLon);
  }

  /**
   * GET /rides
   * Get all rides with optional filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get all rides' })
  @ApiQuery({ name: 'status', required: false, enum: RideStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Rides retrieved successfully' })
  async getAllRides(
    @Query('status') status?: RideStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ rides: Ride[]; total: number }> {
    return this.ridesService.getAllRides(status, page, limit);
  }

  /**
   * GET /rides/:id
   * Get a single ride by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a ride by ID' })
  @ApiParam({ name: 'id', description: 'Ride ID' })
  @ApiResponse({ status: 200, description: 'Ride retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ride not found' })
  async getRideById(@Param('id', ParseIntPipe) id: number): Promise<Ride> {
    return this.ridesService.getRideById(id);
  }

  /**
   * PATCH /rides/:id/points
   * Adjust points for a completed ride
   */
  @Patch(':id/points')
  @ApiOperation({ summary: 'Adjust points for a ride' })
  @ApiParam({ name: 'id', description: 'Ride ID' })
  @ApiResponse({ status: 200, description: 'Points adjusted successfully' })
  @ApiResponse({ status: 404, description: 'Ride not found' })
  async adjustRidePoints(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { points: number; reason: string },
  ): Promise<Ride> {
    return this.ridesService.adjustRidePoints(id, body.points, body.reason);
  }
}
