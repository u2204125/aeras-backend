import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RidesService } from '../rides/rides.service';
import { PullersService } from '../pullers/pullers.service';
import { MqttController } from './mqtt.controller';

/**
 * NotificationsGateway
 * Handles WebSocket connections for Admin Panel and Puller Apps
 * Real-time updates and bidirectional communication
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Store connected pullers for targeted messaging
  private connectedPullers: Map<number, string> = new Map(); // pullerId -> socketId

  constructor(
    @Inject(forwardRef(() => RidesService))
    private ridesService: RidesService,
    @Inject(forwardRef(() => PullersService))
    private pullersService: PullersService,
    @Inject(forwardRef(() => MqttController))
    private mqttController: MqttController,
  ) {}

  /**
   * Handle client connection (admin or puller)
   */
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   * Automatically sets puller as offline when they disconnect
   */
  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Find and remove from connected pullers if it was a puller
    for (const [pullerId, socketId] of this.connectedPullers.entries()) {
      if (socketId === client.id) {
        this.connectedPullers.delete(pullerId);
        console.log(`Puller ${pullerId} disconnected`);
        
        // Set puller as offline
        try {
          await this.pullersService.setOnlineStatus(pullerId, false);
          console.log(`✅ Puller ${pullerId} set to offline`);
          
          // Publish to MQTT for hardware
          this.mqttController.publish(`aeras/pullers/${pullerId}/status`, {
            pullerId,
            isOnline: false,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error(`Failed to set puller ${pullerId} offline:`, error);
        }
        
        break;
      }
    }
  }

  /**
   * Handle puller registration
   * Called when puller app connects with their ID
   * Automatically sets puller as online when they connect
   */
  @SubscribeMessage('register_puller')
  async handlePullerRegistration(
    @MessageBody() data: { pullerId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { pullerId } = data;
    this.connectedPullers.set(pullerId, client.id);
    console.log(`✅ Puller ${pullerId} registered with socket ${client.id}`);
    
    // Automatically set puller as online when they connect
    try {
      await this.pullersService.setOnlineStatus(pullerId, true);
      console.log(`✅ Puller ${pullerId} set to online`);
      
      // Publish to MQTT for hardware
      this.mqttController.publish(`aeras/pullers/${pullerId}/status`, {
        pullerId,
        isOnline: true,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(`Failed to set puller ${pullerId} online:`, error);
    }
    
    return {
      event: 'puller_registered',
      data: { pullerId, success: true, isOnline: true },
    };
  }

  /**
   * Send message to specific puller
   */
  sendToPuller(pullerId: number, event: string, data: any) {
    const socketId = this.connectedPullers.get(pullerId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      console.log(`📤 Sent '${event}' to puller ${pullerId}`);
    } else {
      console.log(`⚠️  Puller ${pullerId} not connected via WebSocket`);
    }
  }

  /**
   * Broadcast new ride request to all connected pullers
   * Used when a new ride is created and needs to be distributed
   */
  broadcastNewRideRequest(rideRequest: any) {
    this.server.emit('new_ride_request', rideRequest);
    console.log(`📢 Broadcasted new ride request ${rideRequest.rideId} to all pullers`);
  }

  /**
   * Send ride request to specific puller
   * Used when distributing rides to nearby pullers only
   */
  sendRideRequestToPuller(pullerId: number, rideRequest: any) {
    this.sendToPuller(pullerId, 'new_ride_request', rideRequest);
  }

  /**
   * Broadcast ride filled notification
   * Notifies all pullers that a ride has been accepted
   */
  broadcastRideFilled(rideId: number) {
    this.server.emit('ride_filled', { rideId });
    console.log(`📢 Broadcasted ride filled notification for ride ${rideId}`);
  }

  /**
   * Handle puller accepting a ride via WebSocket
   */
  @SubscribeMessage('accept_ride')
  async handleAcceptRide(
    @MessageBody() data: { rideId: number; pullerId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const ride = await this.ridesService.acceptRide(data.rideId, data.pullerId.toString());
      
      // Publish to MQTT for hardware
      this.mqttController.publishRideStatus(ride.id, ride.status, {
        puller: { id: ride.puller.id, name: ride.puller.name },
      });
      
      return { event: 'ride_accepted', data: ride };
    } catch (error) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  /**
   * Handle puller rejecting a ride via WebSocket
   */
  @SubscribeMessage('reject_ride')
  async handleRejectRide(
    @MessageBody() data: { rideId: number; pullerId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.ridesService.rejectRide(data.rideId, data.pullerId.toString());
      
      // Already publishes to MQTT in ridesService
      return { event: 'ride_rejected', data: result };
    } catch (error) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  /**
   * Handle puller confirming pickup via WebSocket
   */
  @SubscribeMessage('confirm_pickup')
  async handleConfirmPickup(
    @MessageBody() data: { rideId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const ride = await this.ridesService.pickupRide(data.rideId);
      
      // Publish to MQTT for hardware
      this.mqttController.publishRideStatus(ride.id, ride.status);
      
      return { event: 'pickup_confirmed', data: ride };
    } catch (error) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  /**
   * Handle puller completing ride via WebSocket
   */
  @SubscribeMessage('complete_ride')
  async handleCompleteRide(
    @MessageBody() data: { rideId: number; finalLat: number; finalLon: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const ride = await this.ridesService.completeRide(data.rideId, data.finalLat, data.finalLon);
      
      // Already publishes to MQTT in ridesService
      return { event: 'ride_completed', data: ride };
    } catch (error) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  /**
   * Handle puller location update via WebSocket
   */
  @SubscribeMessage('update_location')
  async handleUpdateLocation(
    @MessageBody() data: { pullerId: number; lat: number; lon: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.pullersService.updateLocation(data.pullerId, data.lat, data.lon);
      
      // Publish to MQTT for hardware
      this.mqttController.publish(`aeras/pullers/${data.pullerId}/location`, {
        pullerId: data.pullerId,
        latitude: data.lat,
        longitude: data.lon,
        timestamp: new Date(),
      });
      
      return { event: 'location_updated', data: { success: true } };
    } catch (error) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  /**
   * Handle puller status update via WebSocket
   */
  @SubscribeMessage('update_status')
  async handleUpdateStatus(
    @MessageBody() data: { pullerId: number; isOnline: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.pullersService.setOnlineStatus(data.pullerId, data.isOnline);
      
      // Publish to MQTT for hardware
      this.mqttController.publish(`aeras/pullers/${data.pullerId}/status`, {
        pullerId: data.pullerId,
        isOnline: data.isOnline,
        timestamp: new Date(),
      });
      
      // Broadcast to admin dashboard
      this.broadcastPullerStatusUpdate(data.pullerId, data.isOnline);
      
      return { event: 'status_updated', data: { success: true } };
    } catch (error) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  /**
   * Broadcast ride status update to all connected clients
   * Useful for admin dashboard
   */
  broadcastRideStatusUpdate(ride: any) {
    this.server.emit('ride_update', ride);

    // Also emit activity event for activity feed
    let activityMessage = '';
    let activityType = '';

    switch (ride.status) {
      case 'PENDING_USER_CONFIRMATION':
        activityMessage = `New ride requested from ${ride.startBlock?.destinationName || 'unknown'}`;
        activityType = 'ride_created';
        break;
      case 'SEARCHING':
        activityMessage = `Ride #${ride.id} confirmed and searching for pullers`;
        activityType = 'ride_searching';
        break;
      case 'ACCEPTED':
        activityMessage = `Ride #${ride.id} accepted by ${ride.puller?.name || 'a puller'}`;
        activityType = 'ride_accepted';
        break;
      case 'ACTIVE':
        activityMessage = `Ride #${ride.id} - Passenger picked up`;
        activityType = 'ride_active';
        break;
      case 'COMPLETED':
        activityMessage = `Ride #${ride.id} completed - ${ride.pointsAwarded || 0} points awarded`;
        activityType = 'ride_completed';
        break;
      default:
        activityMessage = `Ride #${ride.id} status updated to ${ride.status}`;
        activityType = 'ride_update';
    }

    if (activityMessage) {
      this.server.emit('activity_event', {
        id: Date.now(),
        type: activityType,
        message: activityMessage,
        timestamp: new Date().toISOString(),
        rideId: ride.id,
      });
    }
  }

  /**
   * Broadcast a general notification to all admin clients
   */
  broadcastNotification(notification: any) {
    this.server.emit('notification', notification);
  }

  /**
   * Broadcast puller status update to admin dashboard
   * Shows real-time puller online/offline status
   */
  broadcastPullerStatusUpdate(pullerId: number, isOnline: boolean) {
    this.server.emit('puller_status_update', {
      pullerId,
      isOnline,
      timestamp: new Date().toISOString(),
    });
  }
}
