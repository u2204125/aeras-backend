import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Patch,
  Put,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import {
  AdjustPointsDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UpdateSettingsDto,
} from './dto/admin.dto';
import { RideStatus } from '../rides/ride.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * AdminController
 * Handles all administrative endpoints
 */
@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /admin/rides
   * Get paginated and filterable list of all rides
   */
  @Get('rides')
  @ApiOperation({ summary: 'Get all rides with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RideStatus })
  @ApiQuery({ name: 'pullerId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Rides retrieved successfully' })
  async getAllRides(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: RideStatus,
    @Query('pullerId') pullerId?: number,
  ): Promise<any> {
    return this.adminService.getAllRides(page, limit, status, pullerId);
  }

  /**
   * POST /admin/points/adjust
   * Manually adjust puller points
   */
  @Post('points/adjust')
  @ApiOperation({ summary: 'Manually adjust puller points' })
  @ApiResponse({ status: 200, description: 'Points adjusted successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async adjustPoints(@Body() adjustPointsDto: AdjustPointsDto): Promise<any> {
    return this.adminService.adjustPoints(
      adjustPointsDto.pullerId,
      adjustPointsDto.points,
      adjustPointsDto.reason,
    );
  }

  /**
   * GET /admin/stats
   * Get system statistics (alias for analytics overview for frontend compatibility)
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getSystemStats(): Promise<any> {
    const overview = await this.adminService.getAnalyticsOverview();
    return {
      activeRides: overview.totalActiveRides,
      onlinePullers: overview.onlinePullers,
      totalRidesToday: overview.totalRidesToday,
      pendingPointReviews: overview.pendingReviews,
    };
  }

  /**
   * GET /admin/analytics/overview
   * Get analytics overview
   */
  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalyticsOverview(): Promise<any> {
    return this.adminService.getAnalyticsOverview();
  }

  /**
   * GET /admin/analytics/destinations
   * Get ride count grouped by destination
   */
  @Get('analytics/destinations')
  @ApiOperation({ summary: 'Get destination analytics' })
  @ApiResponse({ status: 200, description: 'Destination analytics retrieved successfully' })
  async getDestinationAnalytics(): Promise<any> {
    return this.adminService.getDestinationAnalytics();
  }

  /**
   * GET /admin/analytics/rides-over-time
   * Get ride count over time for charts
   */
  @Get('analytics/rides-over-time')
  @ApiOperation({ summary: 'Get rides over time' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back',
  })
  @ApiResponse({ status: 200, description: 'Rides over time data retrieved successfully' })
  async getRidesOverTime(@Query('days') days?: number): Promise<any> {
    return this.adminService.getRidesOverTime(days || 30);
  }

  /**
   * GET /admin/analytics/popular-destinations
   * Get most popular destinations
   */
  @Get('analytics/popular-destinations')
  @ApiOperation({ summary: 'Get popular destinations' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Popular destinations retrieved successfully' })
  async getPopularDestinations(@Query('limit') limit?: number): Promise<any> {
    return this.adminService.getPopularDestinations(limit || 10);
  }

  /**
   * GET /admin/analytics/peak-hours
   * Get peak hours analytics
   */
  @Get('analytics/peak-hours')
  @ApiOperation({ summary: 'Get peak hours analytics' })
  @ApiResponse({ status: 200, description: 'Peak hours data retrieved successfully' })
  async getPeakHours(): Promise<any> {
    return this.adminService.getPeakHours();
  }

  /**
   * GET /admin/analytics/leaderboard
   * Get puller leaderboard
   */
  @Get('analytics/leaderboard')
  @ApiOperation({ summary: 'Get puller leaderboard' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  async getLeaderboard(
    @Query('period') period?: string,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.adminService.getLeaderboard(period || 'month', limit || 10);
  }

  /**
   * GET /admin/pullers
   * Get all pullers with statistics
   */
  @Get('pullers')
  @ApiOperation({ summary: 'Get all pullers' })
  @ApiResponse({ status: 200, description: 'Pullers retrieved successfully' })
  async getAllPullers(): Promise<any> {
    return this.adminService.getAllPullers();
  }

  /**
   * GET /admin/pullers/:id/stats
   * Get detailed statistics for a specific puller
   */
  @Get('pullers/:id/stats')
  @ApiOperation({ summary: 'Get puller statistics' })
  @ApiParam({ name: 'id', description: 'Puller ID' })
  @ApiResponse({ status: 200, description: 'Puller statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Puller not found' })
  async getPullerStats(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.adminService.getPullerStats(id);
  }

  /**
   * GET /admin/profile
   * Get current admin profile
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: any): Promise<any> {
    return this.adminService.getProfile(req.user.id);
  }

  /**
   * PATCH /admin/profile
   * Update current admin profile
   */
  @Patch('profile')
  @ApiOperation({ summary: 'Update admin profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or username already exists' })
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<any> {
    return this.adminService.updateProfile(req.user.id, updateProfileDto);
  }

  /**
   * POST /admin/change-password
   * Change admin password
   */
  @Post('change-password')
  @ApiOperation({ summary: 'Change admin password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.adminService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  /**
   * GET /admin/settings
   * Get admin settings
   */
  @Get('settings')
  @ApiOperation({ summary: 'Get admin settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings(@Request() req: any): Promise<any> {
    return this.adminService.getSettings(req.user.id);
  }

  /**
   * PUT /admin/settings
   * Update admin settings
   */
  @Put('settings')
  @ApiOperation({ summary: 'Update admin settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(
    @Request() req: any,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ): Promise<any> {
    return this.adminService.updateSettings(req.user.id, updateSettingsDto.settings);
  }
}
