import { Module, forwardRef } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { MqttController } from './mqtt.controller';
import { PullersModule } from '../pullers/pullers.module';
import { RidesModule } from '../rides/rides.module';

/**
 * NotificationsModule
 * Handles all real-time communication (WebSockets and MQTT)
 */
@Module({
  imports: [
    forwardRef(() => PullersModule),
    forwardRef(() => RidesModule),
  ],
  providers: [NotificationsGateway, MqttController],
  exports: [NotificationsGateway, MqttController],
})
export class NotificationsModule {}
