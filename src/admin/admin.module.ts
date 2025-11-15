import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Ride } from '../rides/ride.entity';
import { Puller } from '../entities/puller.entity';
import { PointsHistory } from '../entities/points-history.entity';
import { LocationBlock } from '../entities/location-block.entity';
import { Admin } from '../entities/admin.entity';

/**
 * AdminModule
 * Handles all administrative functionality
 */
@Module({
  imports: [TypeOrmModule.forFeature([Ride, Puller, PointsHistory, LocationBlock, Admin])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
