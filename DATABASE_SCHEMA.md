# Aeras Backend Database Schema

> **Version:** 1.0.0  
> **Database Type:** PostgreSQL  
> **Last Updated:** November 15, 2025

## Table of Contents
- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
  - [Admins](#admins)
  - [Riders](#riders)
  - [Pullers](#pullers)
  - [Location Blocks](#location-blocks)
  - [Rides](#rides)
  - [Points History](#points-history)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Enums](#enums)

---

## Overview

The Aeras backend database is designed to manage a rickshaw ride-sharing platform. It handles:
- Admin user authentication and management
- Rider (customer) profiles
- Puller (rickshaw driver) profiles and tracking
- Location blocks (geographical areas)
- Ride requests and tracking
- Points/rewards system for pullers

---

## Entity Relationship Diagram

```
┌─────────────┐
│   Admins    │
└─────────────┘

┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Riders    │────────<│    Rides    │>────────│   Pullers    │
└─────────────┘         └─────────────┘         └──────────────┘
                              │ │                       │
                              │ │                       │
                              │ └───────────────────────┼──────┐
                              │                         │      │
                              │                         ▼      ▼
                        ┌─────▼──────┐         ┌────────────────┐
                        │  Location  │         │ Points History │
                        │   Blocks   │         └────────────────┘
                        └────────────┘
                        (start/dest)
```

---

## Tables

### Admins

**Table Name:** `admins`

Admin users who can access the admin panel and manage the system.

| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | - | Unique identifier |
| `username` | VARCHAR(255) | UNIQUE, NOT NULL | - | Admin username for login |
| `password` | VARCHAR(255) | NOT NULL | - | Hashed password (bcrypt) |
| `email` | VARCHAR(255) | NULLABLE | NULL | Admin email address |
| `phone` | VARCHAR(50) | NULLABLE | NULL | Admin phone number |
| `role` | VARCHAR(50) | NOT NULL | 'Administrator' | Admin role/title |
| `settings` | JSON | NULLABLE | NULL | User preferences and settings |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record update timestamp |

**Settings JSON Schema:**
```json
{
  "emailNotifications": boolean,
  "pushNotifications": boolean,
  "soundEnabled": boolean,
  "theme": string,
  "compactMode": boolean,
  "mapProvider": string,
  "defaultZoom": number,
  "autoRefresh": boolean,
  "refreshInterval": number,
  "timezone": string,
  "dateFormat": string,
  "timeFormat": string
}
```

---

### Riders

**Table Name:** `riders`

Customers who request rides in the system.

| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | - | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | - | Rider's full name |
| `phone` | VARCHAR(20) | UNIQUE, NOT NULL | - | Rider's phone number |
| `email` | VARCHAR(255) | NULLABLE | NULL | Rider's email address |
| `isActive` | BOOLEAN | NOT NULL | TRUE | Whether rider account is active |
| `totalRides` | INTEGER | NOT NULL | 0 | Total number of rides taken |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record update timestamp |

---

### Pullers

**Table Name:** `pullers`

Rickshaw pullers who accept and complete ride requests.

| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | - | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | - | Puller's full name |
| `phone` | VARCHAR(20) | UNIQUE, NOT NULL | - | Puller's phone number |
| `pointsBalance` | INTEGER | NOT NULL | 0 | Current points/rewards balance |
| `isOnline` | BOOLEAN | NOT NULL | FALSE | Whether puller is currently online |
| `isActive` | BOOLEAN | NOT NULL | TRUE | Whether puller account is active |
| `lastKnownLat` | FLOAT | NULLABLE | NULL | Last known latitude position |
| `lastKnownLon` | FLOAT | NULLABLE | NULL | Last known longitude position |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record update timestamp |

---

### Location Blocks

**Table Name:** `location_blocks`

Geographical areas/blocks that serve as pickup and destination points.

| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | - | Unique identifier |
| `blockId` | VARCHAR(100) | UNIQUE, NOT NULL | - | Unique block identifier (e.g., 'Pahartoli') |
| `destinationName` | VARCHAR(255) | NOT NULL | - | Display name for the location |
| `latitude` | FLOAT | NOT NULL | - | Latitude coordinate |
| `longitude` | FLOAT | NOT NULL | - | Longitude coordinate |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record update timestamp |

---

### Rides

**Table Name:** `rides`

Individual ride requests and their lifecycle from request to completion.

| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | - | Unique identifier |
| `status` | ENUM | NOT NULL | 'PENDING_USER_CONFIRMATION' | Current ride status |
| `requestTime` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | When ride was requested |
| `acceptTime` | TIMESTAMP | NULLABLE | NULL | When ride was accepted by puller |
| `pickupTime` | TIMESTAMP | NULLABLE | NULL | When rider was picked up |
| `completionTime` | TIMESTAMP | NULLABLE | NULL | When ride was completed |
| `pointsAwarded` | INTEGER | NULLABLE | NULL | Points awarded to puller |
| `rejectedByPullers` | SIMPLE_ARRAY | NULLABLE | NULL | Array of puller IDs who rejected |
| `riderId` | INTEGER | FOREIGN KEY, NULLABLE | NULL | Reference to rider |
| `pullerId` | INTEGER | FOREIGN KEY, NULLABLE | NULL | Reference to puller |
| `startBlockId` | INTEGER | FOREIGN KEY, NOT NULL | - | Reference to starting location |
| `destinationBlockId` | INTEGER | FOREIGN KEY, NOT NULL | - | Reference to destination location |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**
- `riderId` → `riders.id`
- `pullerId` → `pullers.id`
- `startBlockId` → `location_blocks.id`
- `destinationBlockId` → `location_blocks.id`

---

### Points History

**Table Name:** `points_history`

Historical record of all point changes for pullers.

| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | - | Unique identifier |
| `pointsChange` | INTEGER | NOT NULL | - | Amount of points added/removed |
| `reason` | ENUM | NOT NULL | - | Reason for point change |
| `pullerId` | INTEGER | FOREIGN KEY, NOT NULL | - | Reference to puller |
| `rideId` | INTEGER | FOREIGN KEY, NULLABLE | NULL | Reference to associated ride |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**
- `pullerId` → `pullers.id`
- `rideId` → `rides.id`

---

## Relationships

### One-to-Many Relationships

1. **Rider → Rides**
   - One rider can have many rides
   - Relationship: `riders.id` ← `rides.riderId`

2. **Puller → Rides**
   - One puller can have many rides
   - Relationship: `pullers.id` ← `rides.pullerId`

3. **Puller → Points History**
   - One puller can have many point history records
   - Relationship: `pullers.id` ← `points_history.pullerId`

4. **Location Block → Rides (Starting)**
   - One location block can be the start point for many rides
   - Relationship: `location_blocks.id` ← `rides.startBlockId`

5. **Location Block → Rides (Destination)**
   - One location block can be the destination for many rides
   - Relationship: `location_blocks.id` ← `rides.destinationBlockId`

6. **Ride → Points History**
   - One ride can be associated with multiple point history records
   - Relationship: `rides.id` ← `points_history.rideId`

---

## Indexes

### Unique Indexes
- `admins.username` - Ensures unique admin usernames
- `riders.phone` - Ensures unique rider phone numbers
- `pullers.phone` - Ensures unique puller phone numbers
- `location_blocks.blockId` - Ensures unique location identifiers

### Foreign Key Indexes (automatically created)
- `rides.riderId`
- `rides.pullerId`
- `rides.startBlockId`
- `rides.destinationBlockId`
- `points_history.pullerId`
- `points_history.rideId`

### Recommended Additional Indexes
```sql
-- For ride status queries
CREATE INDEX idx_rides_status ON rides(status);

-- For rider ride history
CREATE INDEX idx_rides_rider_created ON rides(riderId, createdAt DESC);

-- For puller ride history
CREATE INDEX idx_rides_puller_created ON rides(pullerId, createdAt DESC);

-- For online pullers
CREATE INDEX idx_pullers_online ON pullers(isOnline, isActive);

-- For points history lookups
CREATE INDEX idx_points_puller_created ON points_history(pullerId, createdAt DESC);
```

---

## Enums

### RideStatus

Defines all possible states of a ride in its lifecycle.

| Value | Description |
|-------|-------------|
| `PENDING_USER_CONFIRMATION` | Ride created, waiting for rider to confirm |
| `SEARCHING` | Looking for available pullers |
| `ACCEPTED` | Puller has accepted the ride |
| `ACTIVE` | Ride is in progress |
| `COMPLETED` | Ride has been completed successfully |
| `CANCELLED` | Ride was cancelled (by rider or puller) |
| `EXPIRED` | Ride request expired without being accepted |

### PointReason

Defines reasons for point balance changes.

| Value | Description |
|-------|-------------|
| `RIDE_COMPLETION` | Points awarded for completing a ride |
| `MANUAL_ADJUSTMENT` | Manual adjustment by admin |
| `REDEMPTION` | Points redeemed/spent by puller |
| `FRAUD_REVERSAL` | Points removed due to fraud detection |

---

## Database Setup

### Prerequisites
- PostgreSQL 12 or higher
- Node.js and npm/pnpm

### Initial Setup

1. **Create Database:**
```sql
CREATE DATABASE aeras_db;
```

2. **Configure Environment:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=aeras_db
```

3. **Run Migrations:**
```bash
pnpm run migration:run
```

4. **Seed Database:**
```bash
pnpm run seed
```

---

## Maintenance

### Backup Strategy
```bash
# Backup entire database
pg_dump -U postgres aeras_db > backup_$(date +%Y%m%d).sql

# Restore database
psql -U postgres aeras_db < backup_20251115.sql
```

### Common Queries

**Get active rides:**
```sql
SELECT r.*, ri.name as rider_name, p.name as puller_name
FROM rides r
LEFT JOIN riders ri ON r."riderId" = ri.id
LEFT JOIN pullers p ON r."pullerId" = p.id
WHERE r.status IN ('SEARCHING', 'ACCEPTED', 'ACTIVE')
ORDER BY r."requestTime" DESC;
```

**Get online pullers:**
```sql
SELECT * FROM pullers
WHERE "isOnline" = true AND "isActive" = true;
```

**Get puller statistics:**
```sql
SELECT 
  p.id,
  p.name,
  p."pointsBalance",
  COUNT(r.id) as total_rides,
  COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END) as completed_rides
FROM pullers p
LEFT JOIN rides r ON r."pullerId" = p.id
GROUP BY p.id, p.name, p."pointsBalance";
```

---

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-11-15 | Initial schema with all core entities |

---

## Notes

- All timestamps are stored in UTC
- Phone numbers should include country code (e.g., +880)
- Passwords are hashed using bcrypt with salt rounds = 10
- The `synchronize` option in TypeORM should be set to `false` in production
- Use migrations for schema changes in production environments
