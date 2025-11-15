import { Controller, Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { MessagePattern, Payload, Client, ClientMqtt, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PullersService } from '../pullers/pullers.service';
import { RidesService } from '../rides/rides.service';
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
    @Inject(forwardRef(() => RidesService))
    private ridesService: RidesService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  async onModuleInit() {
    // Connect the MQTT client when module initializes
    await this.client.connect();
  }

  /**
   * Publish block status to MQTT topic
   * Used to control LED status on hardware
   */
  publishBlockStatus(blockId: string, payload: any) {
    const topic = `aeras/blocks/${blockId}/status`;

    this.client.emit(topic, payload).subscribe({
      error: (err) => {
        console.error(`Error publishing to ${topic}:`, err);
      },
    });
  }

  /**
   * Publish ride status update
   */
  publishRideStatus(rideId: number, status: string, additionalData?: any) {
    const topic = `aeras/rides/${rideId}/status`;

    const payload = { 
      rideId, 
      status, 
      timestamp: new Date(),
      ...additionalData 
    };

    this.client.emit(topic, payload).subscribe({
      error: (err) => {
        console.error(`Error publishing ride status:`, err);
      },
    });
  }

  /**
   * Publish ride request to specific puller
   */
  publishRideRequest(pullerId: number, rideRequest: any) {
    const topic = `aeras/pullers/${pullerId}/ride-request`;

    this.client.emit(topic, rideRequest).subscribe({
      error: (err) => {
        console.error(`Error publishing ride request to puller ${pullerId}:`, err);
      },
    });
  }

  /**
   * Publish ride filled notification
   */
  publishRideFilled(rideId: number, pullerId: number, pullerName: string) {
    const topic = `aeras/rides/${rideId}/filled`;

    const payload = {
      rideId,
      pullerId,
      pullerName,
      status: 'ACCEPTED',
      timestamp: new Date(),
    };

    this.client.emit(topic, payload).subscribe({
      error: (err) => {
        console.error(`Error publishing ride filled notification:`, err);
      },
    });
  }

  /**
   * Publish ride rejection confirmation to specific puller
   */
  publishRideRejectionConfirmation(pullerId: number, rideId: number) {
    const topic = `aeras/pullers/${pullerId}/ride-rejected`;

    const payload = {
      rideId,
      message: 'Ride rejection recorded',
      timestamp: new Date(),
    };

    this.client.emit(topic, payload).subscribe({
      error: (err) => {
        console.error(`Error publishing ride rejection confirmation:`, err);
      },
    });
  }

  /**
   * Publish ride completion details
   */
  publishRideCompletion(rideId: number, pullerId: number, pointsAwarded: number, distanceFromDestination?: number) {
    const topic = `aeras/rides/${rideId}/completed`;

    const payload = {
      rideId,
      status: 'COMPLETED',
      pointsAwarded,
      pullerId,
      distanceFromDestination: distanceFromDestination ? Math.round(distanceFromDestination) : undefined,
      timestamp: new Date(),
    };

    this.client.emit(topic, payload).subscribe({
      error: (err) => {
        console.error(`Error publishing ride completion:`, err);
      },
    });
  }

  /**
   * Publish ride expiration notification to specific puller
   * Notifies puller that a ride they were offered has expired
   */
  publishRideExpired(rideId: number, pullerId: number) {
    const topic = `aeras/pullers/${pullerId}/ride-expired`;

    const payload = {
      rideId,
      status: 'EXPIRED',
      message: 'Ride expired - no puller accepted within timeout',
      timestamp: new Date(),
    };

    this.client.emit(topic, payload).subscribe({
      error: (err) => {
        console.error(`Error publishing ride expiration to puller ${pullerId}:`, err);
      },
    });
  }

  /**
   * Publish puller login data to MQTT
   * Notifies hardware that a puller has logged in
   */
  publishPullerLogin(pullerId: number, pullerData: any) {
    const topic = `aeras/pullers/${pullerId}/login`;

    const payload = {
      pullerId,
      name: pullerData.name,
      phone: pullerData.phone,
      pointsBalance: pullerData.pointsBalance,
      isOnline: pullerData.isOnline,
      timestamp: new Date(),
    };

    this.client.emit(topic, payload).subscribe({
      error: (err) => {
        console.error(`Error publishing puller login to MQTT:`, err);
      },
    });
  }

  /**
   * Listen to ride requests from hardware
   * Topic: aeras/ride-request
   * Payload: { startBlockId: string, destinationBlockId: string }
   * 
   * Hardware sends both start and destination blocks
   * Backend creates ride and broadcasts to pullers and admin panel via WebSocket
   */
  @MessagePattern('aeras/ride-request')
  async handleHardwareRideRequest(@Payload() data: any) {
    try {
      console.log('📡 Received hardware ride request:', data);
      
      const { blockId, destinationId } = data;

      if (!blockId || !destinationId) {
        console.error('❌ Invalid ride request data - missing block IDs');
        return { received: false, error: 'Missing blockId or destinationId' };
      }

      console.log(`✅ Processing ride request: ${blockId} → ${destinationId}`);
      
      // Create ride directly in SEARCHING status with both blocks
      const ride = await this.ridesService.createRideFromHardware(blockId, destinationId);
      
      console.log(`✅ Ride created: ID ${ride.id}, broadcasting to pullers and admin panel`);
      
      return { 
        received: true, 
        rideId: ride.id,
        status: ride.status,
        blockId, 
        destinationId 
      };
    } catch (error) {
      console.error('❌ Error handling hardware ride request:', error);
      return { received: false, error: error.message };
    }
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

      // Update puller location in database
      await this.pullersService.updateLocation(parseInt(pullerId), latitude, longitude);

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

      // Update puller status in database
      await this.pullersService.setOnlineStatus(parseInt(pullerId), isOnline);

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
      error: (err) => {
        console.error(`Error publishing to ${topic}:`, err);
      },
    });
  }
}
