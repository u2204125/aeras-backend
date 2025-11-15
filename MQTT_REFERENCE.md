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

**Topic Pattern:** `aeras/requests/+/+`  
**Concrete Example:** `aeras/requests/block-1/block-5`

**Purpose:** Hardware location blocks publish ride requests when a user initiates a ride.

**Message Pattern:** `aeras/requests/{originBlockId}/{destinationBlockId}`

**Payload Structure:**
```json
{
  "blockId": "block-1",
  "destinationId": "block-5",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "userId": "optional-user-id",
  "priority": "normal"
}
```

**Handler:** `MqttController.handleHardwareRideRequest()`

**Implementation:**
```typescript
@MessagePattern('aeras/requests/+/+')
handleHardwareRideRequest(@Payload() data: any) {
  console.log('Received hardware ride request:', data);
  // Calls RidesService to create a ride
  return { received: true };
}
```

**Wildcards:**
- `+` matches single level (e.g., `block-1`, `block-2`)
- Subscribe to `aeras/requests/#` to receive all ride requests

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

## Published Topics (Backend Sends)

These are topics that the backend publishes to, sending commands and updates to IoT hardware.

### 3. Block Status Updates

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

### 4. Ride Status Updates

**Topic Pattern:** `aeras/rides/{rideId}/status`  
**Concrete Example:** `aeras/rides/456/status`

**Purpose:** Backend sends ride lifecycle status updates to hardware for display and tracking.

**Payload Structure:**
```json
{
  "rideId": 456,
  "status": "accepted",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "pullerId": 123,
  "pullerName": "John Doe",
  "estimatedTime": 5
}
```

**Status Values:**
- `requested` - Ride has been requested, searching for pullers
- `accepted` - Puller has accepted the ride
- `in_progress` - Puller is on the way or transporting
- `completed` - Ride has been completed successfully
- `cancelled` - Ride was cancelled

**Published by:** `MqttController.publishRideStatus(rideId, status)`

**Implementation:**
```typescript
publishRideStatus(rideId: number, status: string) {
  const topic = `aeras/rides/${rideId}/status`;
  this.client.emit(topic, { rideId, status, timestamp: new Date() }).subscribe({
    next: () => console.log(`Published ride status to ${topic}`),
    error: (err) => console.error(`Error publishing ride status:`, err),
  });
}
```

**Usage Example:**
```typescript
mqttController.publishRideStatus(456, 'accepted');
```

---

## Testing with MQTT Clients

### Using Postman

1. **Create MQTT Request:**
   - Open Postman → Click "New" → Select "MQTT Request"
   - Enter broker URL: `mqtt://broker.hivemq.com:1883`
   - Click "Connect"

2. **Subscribe to Topics:**

   **All ride requests:**
   ```
   Topic: aeras/requests/#
   ```

   **Specific block requests:**
   ```
   Topic: aeras/requests/block-1/+
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

   **Simulate ride request:**
   ```
   Topic: aeras/requests/block-1/block-5
   Payload:
   {
     "blockId": "block-1",
     "destinationId": "block-5",
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
mosquitto_sub -h broker.hivemq.com -p 1883 -t "aeras/requests/#" -v
```

**Subscribe to puller locations only:**
```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -t "aeras/pullers/+/location" -v
```

### Using mosquitto_pub CLI

**Publish a test ride request:**
```bash
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "aeras/requests/block-1/block-5" \
  -m '{"blockId":"block-1","destinationId":"block-5","timestamp":"2025-11-15T10:30:00.000Z"}'
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
| `aeras/requests/{blockId}/{destId}` | Hardware → Backend | 0 | Ride requests from blocks | `handleHardwareRideRequest()` |
| `aeras/pullers/{pullerId}/location` | Hardware → Backend | 0 | GPS location updates | `handlePullerLocationUpdate()` |
| `aeras/blocks/{blockId}/status` | Backend → Hardware | 0 | Block status/LED control | `publishBlockStatus()` |
| `aeras/rides/{rideId}/status` | Backend → Hardware | 0 | Ride lifecycle updates | `publishRideStatus()` |

**QoS Levels:**
- QoS 0: At most once delivery (fire and forget)
- QoS 1: At least once delivery (with acknowledgment)
- QoS 2: Exactly once delivery (highest reliability)

*Current implementation uses QoS 0 for all topics.*

---

## Wildcard Patterns

MQTT supports two wildcard characters:

### Single-level Wildcard (`+`)
Matches exactly one level in the topic hierarchy.

**Examples:**
- `aeras/requests/+/block-5` - Matches any origin block to block-5
- `aeras/pullers/+/location` - Matches location for any puller
- `aeras/blocks/+/status` - Matches status for any block

### Multi-level Wildcard (`#`)
Matches any number of levels in the topic hierarchy. Must be the last character.

**Examples:**
- `aeras/#` - Matches ALL topics under aeras
- `aeras/requests/#` - Matches all ride requests
- `aeras/pullers/#` - Matches all puller topics

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
