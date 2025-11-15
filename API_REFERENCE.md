# AERAS API Reference

Complete API reference for the AERAS e-rickshaw hailing system backend.

## Base URL
- Development: `http://localhost:3000/api/v1`
- All endpoints are prefixed with `/api/v1`

## Authentication

### Admin Login
```http
POST /auth/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin"
  }
}
```

### Puller Login
```http
POST /auth/puller/login
Content-Type: application/json

{
  "phone": "+8801712345678"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "puller": {
    "id": 5,
    "name": "John Doe",
    "phone": "+8801712345678",
    "pointsBalance": 450
  }
}
```

---

## Admin Endpoints

### System Statistics
```http
GET /admin/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "activeRides": 5,
  "onlinePullers": 12,
  "totalRidesToday": 45,
  "pendingPointReviews": 3
}
```

### Rides Management
```http
GET /admin/rides?page=1&limit=10&status=COMPLETED&pullerId=1
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `status` (optional) - Filter by ride status
- `pullerId` (optional) - Filter by puller ID

**Response:**
```json
{
  "rides": [
    {
      "id": 123,
      "status": "COMPLETED",
      "requestTime": "2025-11-15T10:30:00.000Z",
      "completionTime": "2025-11-15T10:50:00.000Z",
      "pointsAwarded": 25,
      "startBlock": { "blockId": "BLOCK_001", "destinationName": "Airport" },
      "destinationBlock": { "blockId": "BLOCK_005", "destinationName": "Mall" },
      "puller": { "id": 5, "name": "John Doe" }
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

### Points Adjustment
```http
POST /admin/points/adjust
Authorization: Bearer {token}
Content-Type: application/json

{
  "pullerId": "1",
  "points": 50,
  "reason": "Bonus for excellent service"
}
```

### Get All Pullers
```http
GET /admin/pullers
Authorization: Bearer {token}
```

### Get Puller Statistics
```http
GET /admin/pullers/:id/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalRides": 150,
  "totalPoints": 2450,
  "averageRating": 4.8,
  "completionRate": 98.5
}
```

---

## Analytics Endpoints

### Rides Over Time
```http
GET /admin/analytics/rides-over-time?days=30
Authorization: Bearer {token}
```

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to retrieve

**Response:**
```json
[
  { "date": "2025-11-01", "count": 15 },
  { "date": "2025-11-02", "count": 20 },
  { "date": "2025-11-03", "count": 18 }
]
```

### Popular Destinations
```http
GET /admin/analytics/popular-destinations?limit=10
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional, default: 10) - Number of destinations to return

**Response:**
```json
[
  { "destination": "Airport", "count": 150 },
  { "destination": "Mall", "count": 120 },
  { "destination": "University", "count": 95 }
]
```

### Peak Hours Analysis
```http
GET /admin/analytics/peak-hours
Authorization: Bearer {token}
```

**Response:**
```json
[
  { "hour": 8, "count": 45 },
  { "hour": 9, "count": 52 },
  { "hour": 17, "count": 48 }
]
```

### Puller Leaderboard
```http
GET /admin/analytics/leaderboard?period=month&limit=10
Authorization: Bearer {token}
```

**Query Parameters:**
- `period` (optional, default: month) - Time period: `week`, `month`, `year`
- `limit` (optional, default: 10) - Number of pullers to return

**Response:**
```json
[
  {
    "rank": 1,
    "pullerId": "5",
    "pullerName": "John Doe",
    "totalPoints": 850,
    "totalRides": 42
  },
  {
    "rank": 2,
    "pullerId": "12",
    "pullerName": "Jane Smith",
    "totalPoints": 720,
    "totalRides": 38
  }
]
```

---

## Rides Endpoints

### Get All Rides
```http
GET /rides?status=SEARCHING&page=1&limit=10
```

**Query Parameters:**
- `status` (optional) - Filter by ride status
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

### Get Ride by ID
```http
GET /rides/:id
```

### Request New Ride (Hardware)
```http
POST /rides/request
Content-Type: application/json

{
  "blockId": "BLOCK_001",
  "destinationId": "BLOCK_005"
}
```

**Response:**
```json
{
  "id": 123,
  "status": "PENDING_USER_CONFIRMATION",
  "startBlock": { "blockId": "BLOCK_001", "destinationName": "Airport" },
  "destinationBlock": { "blockId": "BLOCK_005", "destinationName": "Mall" },
  "requestTime": "2025-11-15T10:30:00.000Z"
}
```

### Confirm Ride (User Confirmation)
```http
POST /rides/:id/confirm
Content-Type: application/json

{
  "pickupLat": 23.8103,
  "pickupLon": 90.4125
}
```

**Response:**
```json
{
  "id": 123,
  "status": "SEARCHING",
  "message": "Ride confirmed and searching for pullers"
}
```

### Accept Ride (Puller)
```http
POST /rides/:id/accept
Content-Type: application/json

{
  "pullerId": "5"
}
```

**Response:**
```json
{
  "id": 123,
  "status": "ACCEPTED",
  "puller": {
    "id": 5,
    "name": "John Doe",
    "phone": "+8801712345678"
  },
  "acceptTime": "2025-11-15T10:32:00.000Z"
}
```

### Reject Ride (Puller)
```http
POST /rides/:id/reject
Content-Type: application/json

{
  "pullerId": "5"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ride rejected successfully"
}
```

### Mark as Picked Up
```http
POST /rides/:id/pickup
```

**Response:**
```json
{
  "id": 123,
  "status": "ACTIVE",
  "pickupTime": "2025-11-15T10:35:00.000Z"
}
```

### Complete Ride
```http
POST /rides/:id/complete
Content-Type: application/json

{
  "finalLat": 23.8103,
  "finalLon": 90.4125
}
```

**Response:**
```json
{
  "id": 123,
  "status": "COMPLETED",
  "completionTime": "2025-11-15T10:50:00.000Z",
  "pointsAwarded": 25,
  "puller": {
    "id": 5,
    "name": "John Doe",
    "pointsBalance": 475
  }
}
```

### Adjust Ride Points (Admin)
```http
PATCH /rides/:id/points
Authorization: Bearer {token}
Content-Type: application/json

{
  "points": 10,
  "reason": "Distance recalculation"
}
```

---

## Pullers Endpoints

### Get All Pullers
```http
GET /pullers?page=1&limit=10&search=john&online=true
```

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 10)
- `search` (optional) - Search by name or phone
- `online` (optional) - Filter by online status (true/false)

**Response:**
```json
{
  "data": [
    {
      "id": 5,
      "name": "John Doe",
      "phone": "+8801712345678",
      "pointsBalance": 450,
      "isOnline": true,
      "isActive": true,
      "lastKnownLat": 23.8103,
      "lastKnownLon": 90.4125
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

### Get Online Pullers
```http
GET /pullers/online
```

### Get Puller by ID
```http
GET /pullers/:id
```

### Get Puller Ride History
```http
GET /pullers/:id/rides?page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "status": "COMPLETED",
      "requestTime": "2025-11-15T10:30:00.000Z",
      "completionTime": "2025-11-15T10:50:00.000Z",
      "pointsAwarded": 25
    }
  ],
  "total": 25
}
```

### Update Puller Location
```http
POST /pullers/:id/location
Content-Type: application/json

{
  "lat": 23.8103,
  "lon": 90.4125
}
```

### Set Puller Online
```http
POST /pullers/:id/online
```

**Response:**
```json
{
  "id": 5,
  "name": "John Doe",
  "isOnline": true
}
```

### Set Puller Offline
```http
POST /pullers/:id/offline
```

**Response:**
```json
{
  "id": 5,
  "name": "John Doe",
  "isOnline": false
}
```

### Adjust Puller Points (Admin)
```http
PATCH /pullers/:id/points
Authorization: Bearer {token}
Content-Type: application/json

{
  "points": 50,
  "reason": "Manual adjustment for error correction"
}
```

### Suspend Puller (Admin)
```http
POST /pullers/:id/suspend
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Multiple customer complaints"
}
```

---

## Location Blocks Endpoints

### Get All Location Blocks
```http
GET /location-blocks
```

**Response:**
```json
[
  {
    "id": 1,
    "blockId": "BLOCK_001",
    "destinationName": "Airport",
    "centerLat": 23.8103,
    "centerLon": 90.4125
  }
]
```

---

## Ride Status Values

| Status | Description |
|--------|-------------|
| `PENDING_USER_CONFIRMATION` | Ride requested from hardware, waiting for user confirmation |
| `SEARCHING` | User confirmed, searching for available puller |
| `ACCEPTED` | Puller accepted the ride |
| `ACTIVE` | Puller picked up the passenger |
| `COMPLETED` | Ride completed successfully |
| `CANCELLED` | Ride cancelled |
| `EXPIRED` | Ride request expired (no puller accepted within time limit) |

---

## Error Responses

All endpoints return standard error format:

```json
{
  "statusCode": 404,
  "message": "Puller 123 not found",
  "error": "Not Found"
}
```

### Common Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Authentication required or failed |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (e.g., ride already accepted) |
| `500` | Internal Server Error | Server error |

---

## Common Error Messages

### Rides
- `"Ride {id} not found"`
- `"Ride is not in SEARCHING status"`
- `"Ride has already been accepted by another puller"`
- `"Ride has expired"`

### Pullers
- `"Puller {id} not found"`
- `"Puller is not online"`
- `"Invalid phone number format"`

### Points
- `"Insufficient points balance"`
- `"Points adjustment must be a valid number"`

---

## Rate Limiting

- Default: 100 requests per minute per IP
- Admin endpoints: 200 requests per minute per token
- WebSocket connections: No rate limit

---

## Pagination

All list endpoints support pagination:

**Request:**
```
GET /endpoint?page=1&limit=10
```

**Response:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

---

## Date/Time Format

All dates use ISO 8601 format:
```
2025-11-15T10:30:00.000Z
```

Timezone: UTC

---

## Testing Endpoints

For development/testing, you can use these tools:

**Swagger UI:** `http://localhost:3000/api-docs`  
**Curl Examples:** See individual endpoint documentation  
**Postman Collection:** Available in `/docs/postman/`
