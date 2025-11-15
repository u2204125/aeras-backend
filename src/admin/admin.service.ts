import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Ride, RideStatus } from '../rides/ride.entity';
import { Puller } from '../entities/puller.entity';
import { PointsHistory, PointReason } from '../entities/points-history.entity';
import { Admin } from '../entities/admin.entity';
import * as bcrypt from 'bcrypt';

/**
 * AdminService
 * Handles all administrative operations
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Ride)
    private ridesRepository: Repository<Ride>,
    @InjectRepository(Puller)
    private pullersRepository: Repository<Puller>,
    @InjectRepository(Admin)
    private adminsRepository: Repository<Admin>,
    private dataSource: DataSource,
  ) {}

  /**
   * Get paginated and filterable list of all rides
   */
  async getAllRides(
    page: number = 1,
    limit: number = 20,
    status?: RideStatus,
    pullerId?: number,
  ): Promise<{ rides: Ride[]; total: number; page: number; totalPages: number }> {
    const query = this.ridesRepository
      .createQueryBuilder('ride')
      .leftJoinAndSelect('ride.startBlock', 'startBlock')
      .leftJoinAndSelect('ride.destinationBlock', 'destinationBlock')
      .leftJoinAndSelect('ride.puller', 'puller')
      .orderBy('ride.requestTime', 'DESC');

    if (status) {
      query.andWhere('ride.status = :status', { status });
    }

    if (pullerId) {
      query.andWhere('ride.pullerId = :pullerId', { pullerId });
    }

    const [rides, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      rides,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Manually adjust puller points
   * Creates a transaction to ensure data consistency
   */
  async adjustPoints(
    pullerId: string,
    points: number,
    reason: string,
  ): Promise<{ puller: Puller; pointsHistory: PointsHistory }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const puller = await queryRunner.manager.findOne(Puller, {
        where: { id: parseInt(pullerId) },
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

      return { puller, pointsHistory };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get analytics overview
   * Returns key statistics for the dashboard
   */
  async getAnalyticsOverview(): Promise<{
    totalActiveRides: number;
    onlinePullers: number;
    pendingReviews: number;
    totalRidesToday: number;
    totalPointsAwarded: number;
  }> {
    // Get active rides count
    const totalActiveRides = await this.ridesRepository.count({
      where: [
        { status: RideStatus.SEARCHING },
        { status: RideStatus.ACCEPTED },
        { status: RideStatus.ACTIVE },
      ],
    });

    // Get online pullers count
    const onlinePullers = await this.pullersRepository.count({
      where: { isOnline: true, isActive: true },
    });

    // Get pending reviews (rides completed but not yet reviewed - placeholder)
    const pendingReviews = 0;

    // Get today's rides
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalRidesToday = await this.ridesRepository.count({
      where: {
        requestTime: today as any, // Using simple comparison
      },
    });

    // Get total points awarded today
    const todayRides = await this.ridesRepository.find({
      where: {
        status: RideStatus.COMPLETED,
      },
      select: ['pointsAwarded'],
    });

    const totalPointsAwarded = todayRides.reduce((sum, ride) => sum + (ride.pointsAwarded || 0), 0);

    return {
      totalActiveRides,
      onlinePullers,
      pendingReviews,
      totalRidesToday,
      totalPointsAwarded,
    };
  }

  /**
   * Get ride count by destination
   * Returns analytics grouped by destination
   */
  async getDestinationAnalytics(): Promise<Array<{ destinationName: string; rideCount: number }>> {
    const results = await this.ridesRepository
      .createQueryBuilder('ride')
      .leftJoin('ride.destinationBlock', 'destinationBlock')
      .select('destinationBlock.destinationName', 'destinationName')
      .addSelect('COUNT(ride.id)', 'rideCount')
      .where('ride.status = :status', { status: RideStatus.COMPLETED })
      .groupBy('destinationBlock.destinationName')
      .orderBy('rideCount', 'DESC')
      .getRawMany();

    return results.map((result) => ({
      destinationName: result.destinationName,
      rideCount: parseInt(result.rideCount),
    }));
  }

  /**
   * Get all pullers with their statistics
   */
  async getAllPullers(): Promise<Puller[]> {
    return this.pullersRepository.find({
      relations: ['rides', 'pointsHistory'],
      order: { pointsBalance: 'DESC' },
    });
  }

  /**
   * Get puller statistics
   */
  async getPullerStats(pullerId: number): Promise<{
    puller: Puller;
    totalRides: number;
    completedRides: number;
    totalPointsEarned: number;
    averageRating: number;
  }> {
    const puller = await this.pullersRepository.findOne({
      where: { id: pullerId },
      relations: ['rides', 'pointsHistory'],
    });

    if (!puller) {
      throw new NotFoundException(`Puller ${pullerId} not found`);
    }

    const totalRides = puller.rides.length;
    const completedRides = puller.rides.filter(
      (ride) => ride.status === RideStatus.COMPLETED,
    ).length;

    const totalPointsEarned = puller.pointsHistory
      .filter((ph) => ph.reason === PointReason.RIDE_COMPLETION)
      .reduce((sum, ph) => sum + ph.pointsChange, 0);

    return {
      puller,
      totalRides,
      completedRides,
      totalPointsEarned,
      averageRating: 0, // Placeholder for future rating system
    };
  }

  /**
   * Get rides over time for analytics charts
   */
  async getRidesOverTime(days: number): Promise<Array<{ date: string; count: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const rides = await this.ridesRepository
      .createQueryBuilder('ride')
      .where('ride.requestTime >= :startDate', { startDate })
      .andWhere('ride.requestTime <= :endDate', { endDate })
      .getMany();

    // Group rides by date
    const ridesByDate: { [key: string]: number } = {};

    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateKey = date.toISOString().split('T')[0];
      ridesByDate[dateKey] = 0;
    }

    // Count rides per date
    rides.forEach((ride) => {
      const dateKey = new Date(ride.requestTime).toISOString().split('T')[0];
      if (ridesByDate[dateKey] !== undefined) {
        ridesByDate[dateKey]++;
      }
    });

    return Object.entries(ridesByDate).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /**
   * Get popular destinations
   */
  async getPopularDestinations(
    limit: number,
  ): Promise<Array<{ destination: string; count: number }>> {
    const results = await this.ridesRepository
      .createQueryBuilder('ride')
      .leftJoin('ride.destinationBlock', 'destinationBlock')
      .select('destinationBlock.destinationName', 'destination')
      .addSelect('COUNT(ride.id)', 'count')
      .where('ride.status = :status', { status: RideStatus.COMPLETED })
      .groupBy('destinationBlock.destinationName')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((result) => ({
      destination: result.destination || 'Unknown',
      count: parseInt(result.count),
    }));
  }

  /**
   * Get peak hours analytics
   */
  async getPeakHours(): Promise<Array<{ hour: number; count: number }>> {
    const rides = await this.ridesRepository
      .createQueryBuilder('ride')
      .where('ride.status = :status', { status: RideStatus.COMPLETED })
      .getMany();

    // Initialize hours 0-23 with 0 count
    const hourCounts: { [key: number]: number } = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }

    // Count rides per hour
    rides.forEach((ride) => {
      const hour = new Date(ride.requestTime).getHours();
      hourCounts[hour]++;
    });

    return Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
    }));
  }

  /**
   * Get puller leaderboard
   */
  async getLeaderboard(
    period: string,
    limit: number,
  ): Promise<
    Array<{
      rank: number;
      pullerId: string;
      pullerName: string;
      totalPoints: number;
      totalRides: number;
    }>
  > {
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const pullers = await this.pullersRepository
      .createQueryBuilder('puller')
      .leftJoinAndSelect(
        'puller.rides',
        'ride',
        'ride.requestTime >= :startDate AND ride.requestTime <= :endDate AND ride.status = :status',
        {
          startDate,
          endDate,
          status: RideStatus.COMPLETED,
        },
      )
      .getMany();

    // Calculate stats for each puller
    const leaderboardData = pullers
      .map((puller) => {
        const completedRides = puller.rides || [];
        const totalPoints = completedRides.reduce(
          (sum, ride) => sum + (ride.pointsAwarded || 0),
          0,
        );

        return {
          pullerId: puller.id.toString(),
          pullerName: puller.name,
          totalPoints,
          totalRides: completedRides.length,
        };
      })
      .filter((entry) => entry.totalRides > 0) // Only include pullers with rides
      .sort((a, b) => b.totalPoints - a.totalPoints) // Sort by points descending
      .slice(0, limit) // Limit results
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

    return leaderboardData;
  }

  /**
   * Get admin profile by ID
   */
  async getProfile(adminId: number): Promise<Partial<Admin>> {
    const admin = await this.adminsRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin not found`);
    }

    // Remove password from response
    const { password, ...profile } = admin;
    return profile;
  }

  /**
   * Update admin profile
   */
  async updateProfile(
    adminId: number,
    updates: { username?: string; email?: string; phone?: string },
  ): Promise<Partial<Admin>> {
    const admin = await this.adminsRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin not found`);
    }

    // Check if username is being changed and if it's already taken
    if (updates.username && updates.username !== admin.username) {
      const existingAdmin = await this.adminsRepository.findOne({
        where: { username: updates.username },
      });
      if (existingAdmin) {
        throw new Error('Username already exists');
      }
    }

    Object.assign(admin, updates);
    await this.adminsRepository.save(admin);

    const { password, ...profile } = admin;
    return profile;
  }

  /**
   * Change admin password
   */
  async changePassword(
    adminId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const admin = await this.adminsRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin not found`);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash and update new password
    admin.password = await bcrypt.hash(newPassword, 10);
    await this.adminsRepository.save(admin);
  }

  /**
   * Get admin settings
   */
  async getSettings(adminId: number): Promise<any> {
    const admin = await this.adminsRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin not found`);
    }

    return (
      admin.settings || {
        emailNotifications: true,
        pushNotifications: false,
        soundEnabled: true,
        theme: 'dark',
        compactMode: false,
        mapProvider: 'openstreetmap',
        defaultZoom: 13,
        autoRefresh: true,
        refreshInterval: 30,
        timezone: 'Asia/Dhaka',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
      }
    );
  }

  /**
   * Update admin settings
   */
  async updateSettings(adminId: number, settings: any): Promise<any> {
    const admin = await this.adminsRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin not found`);
    }

    admin.settings = { ...admin.settings, ...settings };
    await this.adminsRepository.save(admin);

    return admin.settings;
  }
}
