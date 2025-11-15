# WebSocket Events Reference

Complete reference for real-time WebSocket communication in the AERAS system.

## Overview

The AERAS system uses **Socket.IO** for real-time bidirectional communication between the backend and web clients (Admin Panel and Puller App).

**WebSocket URL:** `http://localhost:3000` (connects automatically to Socket.IO namespace)

## Architecture

```
┌─────────────────┐         WebSocket/Socket.IO        ┌──────────────────┐
│   Puller UI 1   │◄──────────────────────────────────►│                  │
└─────────────────┘                                     │                  │
                                                        │     Backend      │
┌─────────────────┐         WebSocket/Socket.IO        │  NotificationsGateway  │
│   Puller UI 2   │◄──────────────────────────────────►│                  │
└─────────────────┘                                     │                  │
                                                        │                  │
┌─────────────────┐         WebSocket/Socket.IO        │                  │
│  Admin Panel    │◄──────────────────────────────────►│                  │
└─────────────────┘                                     └──────────────────┘
```

## Events Flow Diagram

```
┌─────────────┐         WebSocket Events         ┌──────────────┐         ┌──────────────┐
│   Backend   │─────────────────────────────────►│ Admin Panel  │         │  Puller App  │
│             │                                   │              │         │              │
│   Rides     │  ride_update                      │ LiveRidesMap │         │              │
│  Service    │  activity_event                   │ ActivityFeed │         │              │
│             │                                   │ DashboardPg  │         │              │
│             │                                   │              │         │              │
│             │  new_ride_request ────────────────┼──────────────┼────────►│ RideRequest  │
│             │  ride_filled ──────────────────────┼──────────────┼────────►│   Modal      │
│             │  notification ─────────────────────┼──────────────┼────────►│              │
│             │                                   │              │         │              │
│             │◄──────────────────────────────────┼──────────────┼─────────│              │
│             │  register_puller                  │              │         │ (on connect) │
└─────────────┘                                   └──────────────┘         └──────────────┘
```

---

## Backend → Clients Events

### 1. `new_ride_request`
**Description:** Notifies pullers of a new ride request  
**Trigger:** When ride is confirmed by user and searching for pullers  
**Sent to:** Nearby online pullers (top 10 closest)  

**Payload:**
```typescript
{
  id: number;
  pickupBlock: {
    blockId: string;
    name: string;
    centerLat: number;
    centerLon: number;
  };
  destinationBlock: {
    blockId: string;
    name: string;
    centerLat: number;
    centerLon: number;
  };
  pickupLat: number;
  pickupLon: number;
  estimatedPoints: number;
  distance: number;
  expiresAt: Date; // 5 minutes from now
}
```

**Frontend Implementation:**
```typescript
// Puller App
socketService.onRideRequest((request) => {
  setPendingRequest(request);
  playAlertSound();
  showNotification('New Ride Request');
});
```

---

### 2. `ride_filled`
**Description:** Notifies pullers that a ride has been accepted by another puller  
**Trigger:** When a puller accepts a ride  
**Sent to:** All pullers who received the request (except the acceptor)  

**Payload:**
```typescript
{
  rideId: number;
}
```

**Frontend Implementation:**
```typescript
// Puller App
socketService.onRideFilled((data) => {
  if (pendingRequest?.id === data.rideId) {
    setPendingRequest(null); // Clear the request
    stopAlertSound();
  }
});
```

---

### 3. `ride_update`
**Description:** Broadcasts ride status changes to all clients  
**Trigger:** Any ride status change (request, confirm, accept, pickup, complete, reject)  
**Sent to:** All connected clients (broadcast)  

**Payload:**
```typescript
{
  id: number;
  status: 'PENDING_USER_CONFIRMATION' | 'SEARCHING' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startBlock: LocationBlock;
  destinationBlock: LocationBlock;
  puller?: Puller;
  pointsAwarded?: number;
  requestTime: Date;
  acceptTime?: Date;
  pickupTime?: Date;
  completionTime?: Date;
  rejectedByPullers?: number[];
}
```

**Frontend Implementation:**
```typescript
// Admin Panel
socketService.onRideUpdate((ride) => {
  queryClient.invalidateQueries(['rides']);
  queryClient.invalidateQueries(['stats']);
  updateMapMarkers(ride);
});

// Puller App
socketService.onRideUpdate((ride) => {
  if (ride.id === currentRide?.id) {
    setCurrentRide(ride);
  }
});
```

---

### 4. `activity_event`
**Description:** Human-readable activity feed events  
**Trigger:** All ride status changes (emitted alongside ride_update)  
**Sent to:** All connected clients (broadcast)  

**Payload:**
```typescript
{
  id: number;
  type: 'ride_created' | 'ride_searching' | 'ride_accepted' | 'ride_active' | 'ride_completed';
  message: string; // Human-readable message
  timestamp: string; // ISO date string
  rideId: number;
}
```

**Example Messages:**
- `"New ride requested from Pahartoli"`
- `"Ride #1 confirmed and searching for pullers"`
- `"Ride #1 accepted by Mohammad Rahman"`
- `"Ride #1 - Passenger picked up"`
- `"Ride #1 completed - 8 points awarded"`

**Frontend Implementation:**
```typescript
// Admin Panel - Activity Feed
socketService.onActivityEvent((event) => {
  setActivities((prev) => [event, ...prev].slice(0, 10));
});
```

---

### 5. `notification`
**Description:** General notification to a specific puller  
**Trigger:** Various events (ride rejection confirmation, system messages, etc.)  
**Sent to:** Specific puller  

**Payload:**
```typescript
{
  type: string; // e.g., 'ride_rejected', 'points_adjusted', 'system_message'
  message: string;
  rideId?: number;
  [key: string]: any; // Additional context-specific data
}
```

**Frontend Implementation:**
```typescript
// Puller App
socketService.onNotification((notification) => {
  showToast(notification.message, notification.type);
  
  if (notification.type === 'ride_rejected') {
    // Handle ride rejection confirmation
  }
});
```

---

### 6. `puller_status_update`
**Description:** Broadcasts puller online/offline status changes  
**Trigger:** When puller goes online or offline  
**Sent to:** All connected clients (broadcast)  

**Payload:**
```typescript
{
  pullerId: number;
  isOnline: boolean;
  timestamp: string;
}
```

**Frontend Implementation:**
```typescript
// Admin Panel - Pullers Page
socketService.onPullerStatusUpdate((data) => {
  queryClient.setQueryData(['pullers'], (old) => {
    return old.map(puller => 
      puller.id === data.pullerId 
        ? { ...puller, isOnline: data.isOnline }
        : puller
    );
  });
});
```

---

### 7. `stats_update`
**Description:** Updates dashboard statistics  
**Trigger:** Manual broadcast (not currently automatic)  
**Sent to:** All connected clients (broadcast)  

**Payload:**
```typescript
{
  activeRides: number;
  onlinePullers: number;
  totalRidesToday: number;
  pendingPointReviews: number;
}
```

**Frontend Implementation:**
```typescript
// Admin Panel - Dashboard
socketService.onStatsUpdate((stats) => {
  queryClient.setQueryData(['stats'], stats);
});
```

---

### 8. `location_update`
**Description:** Real-time puller location updates  
**Trigger:** When puller location is updated (if GPS streaming is enabled)  
**Sent to:** All connected clients (broadcast)  

**Payload:**
```typescript
{
  pullerId: string;
  location: {
    latitude: number;
    longitude: number;
  };
}
```

**Frontend Implementation:**
```typescript
// Admin Panel - Live Map
socketService.onLocationUpdate((data) => {
  updatePullerMarker(data.pullerId, data.location);
});
```

---

## Clients → Backend Events

### 1. `register_puller`
**Description:** Registers a puller's socket connection for targeted notifications  
**Emitted by:** Puller app on connection  
**Payload:** `pullerId: string`  

**Backend Handler:** `NotificationsGateway.handlePullerRegistration()`

**Response Event:** `registered`
```typescript
{
  event: 'registered',
  data: { pullerId: string }
}
```

**Frontend Implementation:**
```typescript
// Puller App
socket.on('connect', () => {
  socket.emit('register_puller', pullerId);
});

socket.on('registered', (data) => {
  console.log('Registered:', data.pullerId);
  setIsRegistered(true);
});
```

---

## Connection Setup

### Backend Setup

**File:** `backend/src/notifications/notifications.gateway.ts`

```typescript
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  broadcastRideStatusUpdate(ride: Ride) {
    this.server.emit('ride_update', ride);
    this.server.emit('activity_event', {
      id: Date.now(),
      type: 'ride_updated',
      message: `Ride #${ride.id} status changed to ${ride.status}`,
      timestamp: new Date().toISOString(),
      rideId: ride.id,
    });
  }
}
```

### Frontend Setup (Puller App)

**File:** `puller-app/src/services/socket.service.ts`

```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  
  connect(pullerId: string, onConnect: () => void, onDisconnect: () => void) {
    this.socket = io('http://localhost:3000');
    
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.socket?.emit('register_puller', pullerId);
      onConnect();
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      onDisconnect();
    });
  }
  
  onRideRequest(callback: (request: any) => void) {
    this.socket?.on('new_ride_request', callback);
  }
  
  disconnect() {
    this.socket?.disconnect();
  }
}

export const socketService = new SocketService();
```

### Frontend Setup (Admin Panel)

**File:** `admin-panel/src/services/socket.service.ts`

```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  
  connect() {
    this.socket = io('http://localhost:3000');
    
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected (Admin)');
    });
  }
  
  onRideUpdate(callback: (ride: any) => void) {
    this.socket?.on('ride_update', callback);
  }
  
  onActivityEvent(callback: (event: any) => void) {
    this.socket?.on('activity_event', callback);
  }
}

export const socketService = new SocketService();
```

---

## Event Emission Points

### Backend Services

| File | Method | Events Emitted |
|------|--------|----------------|
| `rides.service.ts` | `requestRide()` | `ride_update`, `activity_event` |
| `rides.service.ts` | `confirmRide()` | `ride_update`, `activity_event`, `new_ride_request` |
| `rides.service.ts` | `acceptRide()` | `ride_update`, `activity_event`, `ride_filled` |
| `rides.service.ts` | `rejectRide()` | `ride_update`, `notification` |
| `rides.service.ts` | `pickupRide()` | `ride_update`, `activity_event` |
| `rides.service.ts` | `completeRide()` | `ride_update`, `activity_event` |
| `pullers.service.ts` | `setOnlineStatus()` | `puller_status_update` |

### Frontend Listeners

| Application | Component | Events |
|-------------|-----------|--------|
| Admin Panel | LiveRidesMap | `ride_update`, `location_update` |
| Admin Panel | RecentActivityFeed | `activity_event` |
| Admin Panel | DashboardPage | `stats_update` |
| Admin Panel | PullersPage | `puller_status_update` |
| Puller App | App.tsx | `new_ride_request`, `ride_filled`, `notification` |
| Puller App | All screens | `ride_update` |

---

## Testing WebSocket Events

### Using Browser Console

```javascript
// Check if connected
socketService.isConnected()

// Get socket ID
socketService.getSocketId()

// Listen to all events
socket.onAny((event, ...args) => {
  console.log('📨 Event:', event, 'Data:', args);
});
```

### Using Test Scripts

```bash
# Test complete ride flow with WebSocket
./test-ride-flow.sh

# Test WebSocket connection
./test-websocket.sh

# Test status updates
./test-status-broadcast.sh
```

### Manual Testing

1. **Open Admin Panel** in one browser tab
2. **Open Puller App** in another tab (or mobile)
3. **Login as a puller**
4. **Create a ride request** via API or hardware simulation
5. **Watch events** in browser console and UI updates

---

## Troubleshooting

### Connection Issues

**Problem:** Socket not connecting  
**Solutions:**
- Check backend is running on port 3000
- Verify CORS is enabled in WebSocket gateway
- Check browser console for connection errors
- Ensure Socket.IO client version matches server

**Problem:** Events not received  
**Solutions:**
- Check socket.isConnected() is true
- Verify event listeners are registered
- Check backend logs for emission confirmation
- Ensure event names match exactly (case-sensitive)

### Puller-Specific Issues

**Problem:** Puller not receiving ride requests  
**Solutions:**
- Ensure puller is online (`isOnline: true`)
- Verify puller has GPS location set
- Check if `register_puller` was emitted
- Confirm puller is within range of pickup location

**Problem:** Multiple ride requests appearing  
**Solutions:**
- Ensure `ride_filled` event is handled
- Check if socket is reconnecting multiple times
- Verify ride request modal dismissal logic

---

## Best Practices

### Backend

1. **Always emit paired events** - Emit both `ride_update` and `activity_event` for ride changes
2. **Use targeted emissions** - Send `new_ride_request` only to relevant pullers
3. **Log all emissions** - Add console.log for debugging
4. **Handle socket disconnections** - Clean up registered pullers on disconnect

### Frontend

1. **Clean up listeners** - Use useEffect cleanup to remove listeners
2. **Handle reconnection** - Re-register puller on reconnect
3. **Debounce updates** - Avoid rapid state updates from frequent events
4. **Show connection status** - Display online/offline indicator to users

---

## Event Naming Conventions

- **snake_case** for event names (e.g., `ride_update`, `new_ride_request`)
- **Past tense** for completed actions (e.g., `ride_filled`)
- **Present tense** for ongoing states (e.g., `ride_searching`)
- **Noun_verb** pattern (e.g., `ride_update`, `puller_status_update`)

---

## Summary

✅ **8 events** from backend to clients  
✅ **1 event** from clients to backend  
✅ **Broadcast events** for admin panel real-time updates  
✅ **Targeted events** for puller ride notifications  
✅ **Activity feed** with human-readable messages  
✅ **Complete integration** with ride lifecycle  

The WebSocket system provides real-time updates across all clients! 🎉
