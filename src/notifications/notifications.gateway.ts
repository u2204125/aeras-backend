import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

/**
 * NotificationsGateway
 * Handles WebSocket connections for Admin Panel only
 * Real-time updates and broadcasts for admin dashboard
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

  /**
   * Handle admin client connection
   */
  handleConnection(client: Socket) {
    console.log(`🔌 Admin client connected: ${client.id}`);
    console.log(`   Total admin connections: ${this.server.sockets.sockets.size}`);
  }

  /**
   * Handle admin client disconnection
   */
  handleDisconnect(client: Socket) {
    console.log(`🔌 Admin client disconnected: ${client.id}`);
    console.log(`   Total admin connections: ${this.server.sockets.sockets.size}`);
  }

  /**
   * Broadcast ride status update to all connected clients
   * Useful for admin dashboard
   */
  broadcastRideStatusUpdate(ride: any) {
    this.server.emit('ride_update', ride);
    console.log(`Broadcasted ride update for ride ${ride.id}`);

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
    console.log(`� Broadcasted notification to admin clients`);
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
    console.log(
      `🔄 Broadcasted puller ${pullerId} status to admin: ${isOnline ? 'ONLINE' : 'OFFLINE'}`,
    );
  }
}
