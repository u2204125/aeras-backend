import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { Ride } from './ride.entity';
import { LocationBlock } from '../entities/location-block.entity';
import { Puller } from '../entities/puller.entity';
import { PointsHistory } from '../entities/points-history.entity';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * RidesModule
 * Manages all ride-related functionality
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, LocationBlock, Puller, PointsHistory]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
