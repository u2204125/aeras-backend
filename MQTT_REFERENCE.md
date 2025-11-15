# MQTT Topics Reference - IoTrix System

## Overview

This document provides a comprehensive reference for all MQTT topics used in the IoTrix ride-sharing system. The system uses MQTT for real-time communication between IoT hardware (location blocks, puller devices) and the backend server.

## MQTT Broker Configuration

**Default Broker:** `mqtt://broker.hivemq.com:1883`

**Configuration:**
- Host: `broker.hivemq.com`
- Port: `1883`
- Protocol: MQTT v3.1.1
- Environment Variable: `MQTT_HOST` (defined in `backend/.env`)

**Location in Code:**
- Backend setup: `backend/src/main.ts`
- MQTT Controller: `backend/src/notifications/mqtt.controller.ts`

---

## Topic Structure

All topics follow the pattern: `aeras/{resource}/{identifier}/{action}`

- `aeras` - System namespace
- `{resource}` - Resource type (requests, pullers, blocks, rides)
- `{identifier}` - Specific resource ID
- `{action}` - Action or data type (status, location)

---

## Subscribed Topics (Backend Listens)

These are topics that the backend subscribes to and processes messages from IoT hardware.

### 1. Ride Requests from Hardware

**Topic:** `aeras/ride-request`

**Purpose:** Hardware location blocks publish ride requests when a user initiates a ride. The hardware sends both the start block and destination block in the payload.

**Payload Structure:**
```json
{
  "startBlockId": "BLOCK_001",
  "destinationBlockId": "BLOCK_005",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Required Fields:**
- `startBlockId` (string, required) - The block ID where the ride originates
- `destinationBlockId` (string, required) - The block ID where the ride should end
- `timestamp` (string, optional) - ISO 8601 timestamp

**Handler:** `MqttController.handleHardwareRideRequest()`

**Implementation:**
```typescript
@MessagePattern('aeras/ride-request')
async handleHardwareRideRequest(@Payload() data: any) {
  const { startBlockId, destinationBlockId } = data;
  
  // Creates ride directly in SEARCHING status
  const ride = await this.ridesService.createRideFromHardware(
    startBlockId, 
    destinationBlockId
  );
  
  return { 
    received: true, 
    rideId: ride.id,
    status: ride.status 
  };
}
```

**Flow:**
1. Hardware publishes to `aeras/ride-request` with both block IDs
2. Backend validates and creates ride in **SEARCHING** status (not PENDING_USER_CONFIRMATION)
3. Ride is immediately broadcast to admin panel via WebSocket
4. Ride is distributed to nearby pullers via MQTT
5. Confirmation is sent back to hardware

---

### 2. Puller Location Updates

**Topic Pattern:** `aeras/pullers/+/location`  
**Concrete Example:** `aeras/pullers/123/location`

**Purpose:** Puller devices (GPS-enabled) publish their real-time location coordinates.

**Message Pattern:** `aeras/pullers/{pullerId}/location`

**Payload Structure:**
```json
{
  "pullerId": "123",
  "latitude": 23.8103,
  "longitude": 90.4125,
  "timestamp": "2025-11-15T10:30:00.000Z",
  "accuracy": 5.0,
  "speed": 15.5,
  "heading": 270.0
}
```

**Fields:**
- `pullerId` (string, required) - Unique identifier for the puller
- `latitude` (number, required) - GPS latitude (-90 to 90)
- `longitude` (number, required) - GPS longitude (-180 to 180)
- `timestamp` (string, required) - ISO 8601 timestamp
- `accuracy` (number, optional) - GPS accuracy in meters
- `speed` (number, optional) - Speed in km/h
- `heading` (number, optional) - Direction in degrees (0-360)

**Handler:** `MqttController.handlePullerLocationUpdate()`

**Implementation:**
```typescript
@MessagePattern('aeras/pullers/+/location')
handlePullerLocationUpdate(@Payload() data: any) {
  console.log('Received puller location update:', data);
  // Calls PullersService to update location in database
  return { received: true };
}
```

**Wildcards:**
- Subscribe to `aeras/pullers/#` to receive all puller updates
- Subscribe to `aeras/pullers/123/location` for specific puller

---

### 3. Puller Status Updates

**Topic Pattern:** `aeras/pullers/+/status`  
**Concrete Example:** `aeras/pullers/123/status`

**Purpose:** Puller app publishes status updates when going online/offline or changing active state.

**Message Pattern:** `aeras/pullers/{pullerId}/status`

**Payload Structure:**
```json
{
  "pullerId": "123",
  "isOnline": true,
  "isActive": true,
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Fields:**
- `pullerId` (string, required) - Unique identifier for the puller
- `isOnline` (boolean, required) - Whether puller is currently online
- `isActive` (boolean, required) - Whether puller is actively accepting rides
- `timestamp` (string, required) - ISO 8601 timestamp

**Handler:** `MqttController.handlePullerStatusUpdate()`

**Implementation:**
```typescript
@MessagePattern('aeras/pullers/+/status')
handlePullerStatusUpdate(@Payload() data: any) {
  console.log('Received puller status update:', data);
  // Calls PullersService to update status in database
  return { received: true };
}
```

---

## Published Topics (Backend Sends)

These are topics that the backend publishes to, sending updates to puller apps and IoT hardware.

### 4. Ride Request to Specific Puller

**Topic Pattern:** `aeras/pullers/{pullerId}/ride-request`  
**Concrete Example:** `aeras/pullers/123/ride-request`

**Purpose:** Backend sends ride requests to specific pullers based on proximity and availability.

**Payload Structure:**
```json
{
  "rideId": 456,
  "pickupBlock": {
    "blockId": "block-1",
    "name": "Dhaka University",
    "centerLat": 23.8103,
    "centerLon": 90.4125
  },
  "destinationBlock": {
    "blockId": "block-5",
    "name": "Shahbag",
    "centerLat": 23.8200,
    "centerLon": 90.4150
  },
  "estimatedPoints": 8,
  "distance": 250,
  "expiresAt": "2025-11-15T10:35:00.000Z",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Fields:**
- `rideId` (number, required) - Unique ride identifier
- `pickupBlock` (object, required) - Pickup location details
- `destinationBlock` (object, required) - Destination location details
- `estimatedPoints` (number, required) - Points puller will earn
- `distance` (number, optional) - Distance from puller to pickup in meters
- `expiresAt` (string, required) - When the request expires
- `timestamp` (string, required) - ISO 8601 timestamp

**Published by:** `RidesService.distributeRideToNearbyPullers()`

**Usage:** Puller app subscribes to `aeras/pullers/{pullerId}/ride-request` to receive ride notifications.

---

### 5. Ride Rejection Confirmation

**Topic Pattern:** `aeras/pullers/{pullerId}/ride-rejected`  
**Concrete Example:** `aeras/pullers/123/ride-rejected`

**Purpose:** Backend confirms that a puller's ride rejection was recorded successfully.

**Payload Structure:**
```json
{
  "rideId": 456,
  "message": "Ride rejection recorded",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Published by:** `RidesService.rejectRide()`

**Usage:** Puller app receives confirmation after rejecting a ride.

---

### 6. Ride Filled Notification

**Topic Pattern:** `aeras/rides/{rideId}/filled`  
**Concrete Example:** `aeras/rides/456/filled`

**Purpose:** Backend notifies all pullers that a ride has been accepted by another puller and is no longer available.

**Payload Structure:**
```json
{
  "rideId": 456,
  "pullerId": 123,
  "pullerName": "John Doe",
  "status": "ACCEPTED",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Published by:** `RidesService.acceptRide()`

**Usage:** Puller apps subscribe to `aeras/rides/+/filled` to remove filled rides from their available list.

---

### 7. Block Status Updates

**Topic Pattern:** `aeras/blocks/{blockId}/status`  
**Concrete Example:** `aeras/blocks/block-1/status`

**Purpose:** Backend sends status updates to control LED indicators and display status on location blocks.

**Payload Structure:**
```json
{
  "status": "active",
  "ledColor": "green",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "message": "Ready for ride requests"
}
```

**Status Values:**
- `active` - Block is operational and ready
- `inactive` - Block is offline or disabled
- `occupied` - Block currently has an active ride
- `maintenance` - Block is under maintenance

**LED Color Values:**
- `green` - Available/Ready
- `red` - Unavailable/Error
- `yellow` - Warning/Pending
- `blue` - In Progress

**Published by:** `MqttController.publishBlockStatus(blockId, payload)`

**Implementation:**
```typescript
publishBlockStatus(blockId: string, payload: any) {
  const topic = `aeras/blocks/${blockId}/status`;
  this.client.emit(topic, payload).subscribe({
    next: () => console.log(`Published to ${topic}:`, payload),
    error: (err) => console.error(`Error publishing to ${topic}:`, err),
  });
}
```

**Usage Example:**
```typescript
mqttController.publishBlockStatus('block-1', {
  status: 'active',
  ledColor: 'green',
  timestamp: new Date().toISOString(),
  message: 'Ready for ride requests'
});
```

---

### 8. Ride Status Updates

**Topic Pattern:** `aeras/rides/{rideId}/status`  
**Concrete Example:** `aeras/rides/456/status`

**Purpose:** Backend sends ride lifecycle status updates to puller apps and hardware for tracking.

**Payload Structure:**
```json
{
  "rideId": 456,
  "status": "ACCEPTED",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "pullerId": 123,
  "pullerName": "John Doe",
  "estimatedTime": 5
}
```

**Status Values:**
- `PENDING_USER_CONFIRMATION` - Ride initiated, waiting for user
- `SEARCHING` - Looking for available pullers
- `ACCEPTED` - Puller accepted the ride
- `ACTIVE` - Ride in progress (puller picked up rider)
- `COMPLETED` - Ride successfully completed
- `CANCELLED` - Ride was cancelled
- `EXPIRED` - Ride expired after 1 minute with no puller acceptance

**Published by:** `MqttController.publishRideStatus(rideId, status, additionalData)`

**Usage:** Puller apps subscribe to `aeras/rides/+/status` to track ride state changes.

---

### 9. Ride Completion Notification

**Topic Pattern:** `aeras/rides/{rideId}/completed`  
**Concrete Example:** `aeras/rides/456/completed`

**Purpose:** Backend notifies about completed rides with points awarded and final details.

**Payload Structure:**
```json
{
  "rideId": 456,
  "status": "COMPLETED",
  "pointsAwarded": 8,
  "pullerId": 123,
  "distanceFromDestination": 25,
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Fields:**
- `rideId` (number, required) - Unique ride identifier
- `status` (string, required) - Always "COMPLETED"
- `pointsAwarded` (number, required) - Points earned by puller
- `pullerId` (number, required) - Puller who completed the ride
- `distanceFromDestination` (number, optional) - Final distance from destination in meters
- `timestamp` (string, required) - ISO 8601 timestamp

**Published by:** `RidesService.completeRide()`

**Usage:** Puller app can display completion details and update points balance.

---

### 10. Ride Expiration Notification

**Topic Pattern:** `aeras/pullers/{pullerId}/ride-expired`  
**Concrete Example:** `aeras/pullers/123/ride-expired`

**Purpose:** Backend notifies pullers that a ride they were offered has expired due to no acceptance within the timeout period (1 minute).

**Payload Structure:**
```json
{
  "rideId": 456,
  "status": "EXPIRED",
  "message": "Ride expired - no puller accepted within timeout",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Fields:**
- `rideId` (number, required) - Unique ride identifier
- `status` (string, required) - Always "EXPIRED"
- `message` (string, required) - Expiration reason
- `timestamp` (string, required) - ISO 8601 timestamp

**Published by:** `RidesService.autoExpireRide()` (called automatically after 1 minute)

**Auto-Expiration Logic:**
- Triggered 60 seconds after ride creation
- Only applies if ride status is still SEARCHING
- Broadcasts to all online pullers via MQTT
- Broadcasts to admin dashboard via WebSocket
- Publishes status update to MQTT broker for hardware

**Usage:** Puller app should remove expired rides from available list and stop showing notifications.

---

### 11. Puller Login Notification

**Topic Pattern:** `aeras/pullers/{pullerId}/login`  
**Concrete Example:** `aeras/pullers/123/login`

**Purpose:** Backend publishes puller details to MQTT broker when a puller logs in. This allows hardware to display puller information.

**Payload Structure:**
```json
{
  "pullerId": 123,
  "name": "John Doe",
  "phone": "+8801712345678",
  "pointsBalance": 150,
  "isOnline": true,
  "isActive": true,
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Fields:**
- `pullerId` (number, required) - Unique puller identifier
- `name` (string, required) - Puller's name
- `phone` (string, required) - Puller's phone number
- `pointsBalance` (number, required) - Current points balance
- `isOnline` (boolean, required) - Current online status
- `isActive` (boolean, required) - Whether account is active
- `timestamp` (string, required) - ISO 8601 timestamp

**Published by:** `AuthService.loginPuller()`

**Flow:**
1. Puller app sends login request via HTTP API
2. Backend validates and fetches puller data from database
3. Backend publishes puller data to MQTT topic
4. Hardware receives puller details
5. Backend returns puller data + JWT token to app
6. Puller app connects to WebSocket for all subsequent actions

**Usage:** Hardware can display puller name, phone, and points on login.

---

## Topic Summary for Puller App

**HTTP API (Used Only for Login & Data Fetching):**
- `POST /auth/puller/login` - Initial authentication with phone number
- `GET /pullers/{id}` - Fetch puller details
- `GET /pullers/{id}/rides` - Fetch ride history
- `GET /rides` - Fetch available rides

**WebSocket Events (Used for All Actions After Login):**
- `register_puller` - Register puller connection with backend
- `accept_ride` - Accept a ride request
- `reject_ride` - Reject a ride request
- `confirm_pickup` - Confirm passenger pickup
- `complete_ride` - Complete a ride
- `update_location` - Update GPS location
- `update_status` - Update online/offline status

**Subscribed MQTT Topics (Puller App Listens via MQTT Service):**
- `aeras/pullers/{pullerId}/ride-request` - New ride requests from backend
- `aeras/pullers/{pullerId}/ride-rejected` - Rejection confirmations
- `aeras/pullers/{pullerId}/ride-expired` - Ride expiration notifications
- `aeras/rides/+/filled` - Rides filled by other pullers
- `aeras/rides/+/status` - Ride status updates

**Published MQTT Topics (Backend Publishes for Hardware):**
- `aeras/pullers/{pullerId}/login` - Puller login data (name, phone, points)
- `aeras/pullers/{pullerId}/location` - GPS location updates
- `aeras/pullers/{pullerId}/status` - Online/offline status
- `aeras/rides/{rideId}/status` - Ride lifecycle updates

**Communication Flow:**
1. **Login**: HTTP API → Backend validates → Publishes to MQTT → Returns JWT + data
2. **Post-Login**: WebSocket connection established → Backend registered
3. **Actions**: WebSocket events → Backend processes → Publishes to MQTT for hardware
4. **Ride Notifications**: MQTT messages → Puller app receives via MQTT service

---

## Testing with MQTT Clients

### Using Postman

1. **Create MQTT Request:**
   - Open Postman → Click "New" → Select "MQTT Request"
   - Enter broker URL: `mqtt://broker.hivemq.com:1883`
   - Click "Connect"

2. **Subscribe to Topics:**

   **Ride requests from hardware:**
   ```
   Topic: aeras/ride-request
   ```

   **All puller locations:**
   ```
   Topic: aeras/pullers/#
   ```

   **Specific puller:**
   ```
   Topic: aeras/pullers/123/location
   ```

   **All block status:**
   ```
   Topic: aeras/blocks/#
   ```

   **All ride status:**
   ```
   Topic: aeras/rides/#
   ```

   **ALL system topics:**
   ```
   Topic: aeras/#
   ```

3. **Publish Test Messages:**

   **Simulate ride request from hardware:**
   ```
   Topic: aeras/ride-request
   Payload:
   {
     "startBlockId": "BLOCK_001",
     "destinationBlockId": "BLOCK_005",
     "timestamp": "2025-11-15T10:30:00.000Z"
   }
   ```

   **Simulate puller location:**
   ```
   Topic: aeras/pullers/123/location
   Payload:
   {
     "pullerId": "123",
     "latitude": 23.8103,
     "longitude": 90.4125,
     "timestamp": "2025-11-15T10:30:00.000Z"
   }
   ```

### Using mosquitto_sub CLI

**Subscribe to all topics:**
```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -t "aeras/#" -v
```

**Subscribe to ride requests only:**
```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -t "aeras/ride-request" -v
```

**Subscribe to puller locations only:**
```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -t "aeras/pullers/+/location" -v
```

### Using mosquitto_pub CLI

**Publish a test ride request from hardware:**
```bash
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "aeras/ride-request" \
  -m '{"startBlockId":"BLOCK_001","destinationBlockId":"BLOCK_005","timestamp":"2025-11-15T10:30:00.000Z"}'
```

**Publish a test location update:**
```bash
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "aeras/pullers/123/location" \
  -m '{"pullerId":"123","latitude":23.8103,"longitude":90.4125,"timestamp":"2025-11-15T10:30:00.000Z"}'
```

---

## Topic Summary Table

| Topic Pattern | Direction | QoS | Purpose | Handler/Publisher |
|--------------|-----------|-----|---------|-------------------|
| `aeras/ride-request` | Hardware → Backend | 1 | Ride requests from hardware with start & destination | `handleHardwareRideRequest()` |
| `aeras/pullers/{pullerId}/location` | Puller App → Backend | 1 | GPS location updates | `handlePullerLocationUpdate()` |
| `aeras/pullers/{pullerId}/status` | Puller App → Backend | 1 | Online/offline status | `handlePullerStatusUpdate()` |
| `aeras/pullers/{pullerId}/ride-request` | Backend → Puller App | 1 | New ride requests | `distributeRideToNearbyPullers()` |
| `aeras/pullers/{pullerId}/ride-rejected` | Backend → Puller App | 1 | Rejection confirmations | `rejectRide()` |
| `aeras/pullers/{pullerId}/ride-expired` | Backend → Puller App | 1 | Ride expiration notifications (1 min timeout) | `autoExpireRide()` |
| `aeras/rides/{rideId}/filled` | Backend → Puller App | 1 | Ride filled notifications | `acceptRide()` |
| `aeras/rides/{rideId}/status` | Backend → Puller App/Hardware | 1 | Ride lifecycle updates | `publishRideStatus()` |
| `aeras/rides/{rideId}/completed` | Backend → All | 1 | Ride completion details | `completeRide()` |
| `aeras/blocks/{blockId}/status` | Backend → Hardware | 0 | Block status/LED control | `publishBlockStatus()` |

**QoS Levels:**
- QoS 0: At most once delivery (fire and forget)
- QoS 1: At least once delivery (with acknowledgment)
- QoS 2: Exactly once delivery (highest reliability)

*Puller app uses QoS 1 for reliability. Hardware uses QoS 0 for simplicity.*

---

## Wildcard Patterns

MQTT supports two wildcard characters:

### Single-level Wildcard (`+`)
Matches exactly one level in the topic hierarchy.

**Examples:**
- `aeras/pullers/+/location` - Matches location for any puller
- `aeras/blocks/+/status` - Matches status for any block
- `aeras/rides/+/filled` - Matches filled notification for any ride

### Multi-level Wildcard (`#`)
Matches any number of levels in the topic hierarchy. Must be the last character.

**Examples:**
- `aeras/#` - Matches ALL topics under aeras
- `aeras/pullers/#` - Matches all puller topics
- `aeras/rides/#` - Matches all ride-related topics

---

## Message Format Standards

All MQTT messages in the IoTrix system follow these standards:

### JSON Format
All payloads are valid JSON objects.

### Timestamps
All timestamps use ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`

**Example:** `2025-11-15T10:30:00.000Z`

### Encoding
UTF-8 encoding for all messages.

### Message Size
Keep messages under 256KB for optimal performance.

---

## Best Practices

### For Hardware Developers

1. **Always include timestamps** in ISO 8601 format
2. **Validate JSON** before publishing
3. **Use retained messages** for status topics if persistence is needed
4. **Implement reconnection logic** with exponential backoff
5. **Handle connection errors** gracefully
6. **Use QoS 1** for critical messages

### For Backend Developers

1. **Validate incoming messages** before processing
2. **Log all MQTT events** for debugging
3. **Handle malformed messages** without crashing
4. **Use error callbacks** in publish operations
5. **Monitor MQTT connection status**
6. **Implement message throttling** if needed

---

## Security Considerations

### Current Setup (Development)
- Public broker: `broker.hivemq.com`
- No authentication required
- No encryption (plain MQTT)

### Production Recommendations

1. **Use Private Broker:**
   - Deploy Mosquitto on your own server
   - Configure in Docker: `backend/docker-compose.yml`

2. **Enable Authentication:**
   ```bash
   # In mosquitto.conf
   allow_anonymous false
   password_file /mosquitto/config/passwd
   ```

3. **Use TLS/SSL:**
   ```bash
   # In mosquitto.conf
   listener 8883
   cafile /mosquitto/certs/ca.crt
   certfile /mosquitto/certs/server.crt
   keyfile /mosquitto/certs/server.key
   ```

4. **Access Control Lists (ACL):**
   ```bash
   # In mosquitto.conf
   acl_file /mosquitto/config/acl
   ```

---

## Troubleshooting

### Messages Not Received

1. **Check broker connection:**
   ```bash
   mosquitto_sub -h broker.hivemq.com -p 1883 -t "aeras/#" -v
   ```

2. **Verify topic spelling** (case-sensitive)

3. **Check backend logs** for MQTT connection status

4. **Ensure MQTT microservice started:**
   ```
   MQTT microservice connected at: mqtt://broker.hivemq.com:1883
   ```

### Publishing Fails

1. **Check client connection** status
2. **Verify broker is reachable**
3. **Check network/firewall** settings
4. **Review error logs** in backend console

### Performance Issues

1. **Reduce message frequency** if too high
2. **Implement message batching** for location updates
3. **Use QoS 0** for non-critical messages
4. **Monitor broker resources** (CPU, memory)

---

## Code References

### Backend Files
- **MQTT Controller:** `backend/src/notifications/mqtt.controller.ts`
- **Main Configuration:** `backend/src/main.ts`
- **Notifications Module:** `backend/src/notifications/notifications.module.ts`
- **Environment Config:** `backend/.env`

### Configuration Files
- **Docker Compose:** `backend/docker-compose.yml`
- **Mosquitto Config:** `backend/mosquitto/config/mosquitto.conf`

---

## Related Documentation

- [Backend Setup Guide](backend/SETUP_GUIDE.md)
- [API Quick Reference](API_QUICK_REFERENCE.md)
- [WebSocket Integration](WEBSOCKET_INTEGRATION.md)

---

## Changelog

### Version 1.2 - November 15, 2025
- **New Feature:** Auto-expiration of rides after 1 minute with no puller acceptance
- Added new MQTT topic: `aeras/pullers/{pullerId}/ride-expired`
- Rides in SEARCHING status automatically expire after 60 seconds
- Expiration broadcasts to all online pullers via MQTT
- Expiration updates sent to admin panel via WebSocket
- Expiration status published to MQTT broker for hardware
- Added `EXPIRED` to ride status enum

### Version 1.1 - November 15, 2025
- **Breaking Change:** Simplified ride request topic from `aeras/requests/{blockId}/{destId}` to `aeras/ride-request`
- Hardware now sends both `startBlockId` and `destinationBlockId` in payload
- Rides are created directly in SEARCHING status (skipping PENDING_USER_CONFIRMATION)
- Removed `/rides/request` and `/rides/confirm` REST endpoints
- Ride creation is now exclusively via MQTT from hardware
- Added WebSocket broadcast to admin panel on ride creation
- Improved ride distribution to nearby pullers

### Version 1.0 - November 15, 2025
- Initial MQTT topics documentation
- Added all current topic patterns
- Included testing instructions
- Added security recommendations

---

## Contact & Support

For questions or issues related to MQTT integration, please refer to:
- Backend team for server-side implementation
- Hardware team for IoT device integration
- DevOps team for broker configuration
