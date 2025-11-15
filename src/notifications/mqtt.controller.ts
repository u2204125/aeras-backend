import { Controller, Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { MessagePattern, Payload, Client, ClientMqtt, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PullersService } from '../pullers/pullers.service';
import { NotificationsGateway } from './notifications.gateway';

/**
 * MqttController
 * Handles MQTT communication with IoT hardware and puller devices
 */
@Injectable()
@Controller()
export class MqttController implements OnModuleInit {
  @Client({
    transport: Transport.MQTT,
    options: {
      url: process.env.MQTT_HOST || 'mqtt://broker.hivemq.com:1883',
    },
  })
  client: ClientMqtt;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => PullersService))
    private pullersService: PullersService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  async onModuleInit() {
    // Connect the MQTT client when module initializes
    await this.client.connect();
    console.log(
      '✅ MQTT Controller client connected to:',
      process.env.MQTT_HOST || 'mqtt://broker.hivemq.com:1883',
    );
  }

  /**
   * Publish block status to MQTT topic
   * Used to control LED status on hardware
   */
  publishBlockStatus(blockId: string, payload: any) {
    const topic = `aeras/blocks/${blockId}/status`;

    this.client.emit(topic, payload).subscribe({
      next: () => {
        console.log(`Published to ${topic}:`, payload);
      },
      error: (err) => {
        console.error(`Error publishing to ${topic}:`, err);
      },
    });
  }

  /**
   * Publish ride status update
   */
  publishRideStatus(rideId: number, status: string) {
    const topic = `aeras/rides/${rideId}/status`;

    this.client.emit(topic, { rideId, status, timestamp: new Date() }).subscribe({
      next: () => {
        console.log(`Published ride status to ${topic}`);
      },
      error: (err) => {
        console.error(`Error publishing ride status:`, err);
      },
    });
  }

  /**
   * Listen to ride requests from hardware
   * Topic pattern: aeras/requests/{blockId}/{destinationId}
   */
  @MessagePattern('aeras/requests/+/+')
  handleHardwareRideRequest(@Payload() data: any) {
    console.log('Received hardware ride request:', data);

    // This would typically call RidesService to create a ride
    // For now, just logging
    return { received: true };
  }

  /**
   * Listen to puller location updates from MQTT
   * Topic: aeras/pullers/{pullerId}/location
   */
  @MessagePattern('aeras/pullers/+/location')
  async handlePullerLocationUpdate(@Payload() data: any) {
    try {
      const { pullerId, latitude, longitude } = data;

      if (!pullerId || latitude == null || longitude == null) {
        console.warn('Invalid location data received:', data);
        return { received: false, error: 'Invalid data' };
      }

      console.log(`📍 Received location update from puller ${pullerId}:`, {
        lat: latitude,
        lon: longitude,
      });

      // Update puller location in database
      await this.pullersService.updateLocation(parseInt(pullerId), latitude, longitude);

      console.log(`✅ Updated location for puller ${pullerId} in database`);

      // Broadcast location update to admin dashboard
      this.notificationsGateway.server.emit('puller_location_update', {
        pullerId: parseInt(pullerId),
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });

      return { received: true };
    } catch (error) {
      console.error('Error handling puller location update:', error);
      return { received: false, error: error.message };
    }
  }

  /**
   * Listen to puller status updates from MQTT
   * Topic: aeras/pullers/{pullerId}/status
   */
  @MessagePattern('aeras/pullers/+/status')
  async handlePullerStatusUpdate(@Payload() data: any) {
    try {
      const { pullerId, isOnline, isActive } = data;

      if (!pullerId || isOnline == null) {
        console.warn('Invalid status data received:', data);
        return { received: false, error: 'Invalid data' };
      }

      console.log(`🔄 Received status update from puller ${pullerId}:`, {
        isOnline,
        isActive,
      });

      // Update puller status in database
      await this.pullersService.setOnlineStatus(parseInt(pullerId), isOnline);

      console.log(`✅ Updated status for puller ${pullerId} in database`);

      // Broadcast status to admin dashboard
      this.notificationsGateway.broadcastPullerStatusUpdate(parseInt(pullerId), isOnline);

      return { received: true };
    } catch (error) {
      console.error('Error handling puller status update:', error);
      return { received: false, error: error.message };
    }
  }

  /**
   * Publish a generic message to a topic
   */
  publish(topic: string, message: any) {
    this.client.emit(topic, message).subscribe({
      next: () => {
        console.log(`Published to ${topic}:`, message);
      },
      error: (err) => {
        console.error(`Error publishing to ${topic}:`, err);
      },
    });
  }
}
