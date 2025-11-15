import { Module, forwardRef } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { MqttController } from './mqtt.controller';
import { PullersModule } from '../pullers/pullers.module';

/**
 * NotificationsModule
 * Handles all real-time communication (WebSockets and MQTT)
 */
@Module({
  imports: [forwardRef(() => PullersModule)],
  providers: [NotificationsGateway, MqttController],
  exports: [NotificationsGateway, MqttController],
})
export class NotificationsModule {}
