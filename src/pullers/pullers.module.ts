import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PullersController } from './pullers.controller';
import { PullersService } from './pullers.service';
import { Puller } from '../entities/puller.entity';
import { Ride } from '../rides/ride.entity';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * PullersModule
 * Manages all puller-related functionality
 */
@Module({
  imports: [TypeOrmModule.forFeature([Puller, Ride]), forwardRef(() => NotificationsModule)],
  controllers: [PullersController],
  providers: [PullersService],
  exports: [PullersService],
})
export class PullersModule {}
