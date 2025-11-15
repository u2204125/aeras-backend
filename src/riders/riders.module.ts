import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { Rider } from '../entities/rider.entity';
import { Ride } from '../rides/ride.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rider, Ride])],
  controllers: [RidersController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}
