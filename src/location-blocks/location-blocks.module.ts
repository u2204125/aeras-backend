import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationBlocksController } from './location-blocks.controller';
import { LocationBlocksService } from './location-blocks.service';
import { LocationBlock } from '../entities/location-block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LocationBlock])],
  controllers: [LocationBlocksController],
  providers: [LocationBlocksService],
  exports: [LocationBlocksService],
})
export class LocationBlocksModule {}
