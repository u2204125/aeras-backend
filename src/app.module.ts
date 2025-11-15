import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesModule } from './rides/rides.module';
import { PullersModule } from './pullers/pullers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { LocationBlocksModule } from './location-blocks/location-blocks.module';
import { RidersModule } from './riders/riders.module';
import { LocationBlock } from './entities/location-block.entity';
import { Puller } from './entities/puller.entity';
import { PointsHistory } from './entities/points-history.entity';
import { Admin } from './entities/admin.entity';
import { Rider } from './entities/rider.entity';
import { Ride } from './rides/ride.entity';
import { HealthController } from './health.controller';

/**
 * AppModule
 * Root module of the application
 */
@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM Database Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [LocationBlock, Puller, PointsHistory, Ride, Admin, Rider],
        synchronize: configService.get('NODE_ENV') !== 'production', // Disable in production
        logging: configService.get('NODE_ENV') !== 'production',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    RidesModule,
    PullersModule,
    LocationBlocksModule,
    RidersModule,
    NotificationsModule,
    AdminModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
