# Changelog

All notable changes to the AERAS Backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-15

### Added

#### Core Features
- Complete ride management system with request, accept, pickup, and complete lifecycle
- Point allocation system based on ride completion accuracy
- Location-based puller matching using Haversine distance calculation
- Real-time communication via WebSocket and MQTT
- JWT-based authentication for secure API access
- Comprehensive admin analytics and management endpoints

#### Modules
- **Rides Module**: Full CRUD operations and status management
- **Pullers Module**: Online/offline status, location tracking, points management
- **Riders Module**: Rider registration and profile management
- **Admin Module**: Analytics, point adjustments, system overview
- **Location Blocks Module**: Geographical location management
- **Auth Module**: JWT authentication with Passport
- **Notifications Module**: WebSocket gateway and MQTT controller

#### Real-time Features
- WebSocket gateway for instant ride updates
- MQTT integration for IoT hardware communication
- Automatic ride request broadcasting to available pullers
- Real-time puller location updates
- Live ride status notifications

#### Database
- PostgreSQL integration with TypeORM
- Optimized database schema with proper relationships
- Transaction support for critical operations
- Seeding system for development data
- Point history tracking

#### API & Documentation
- RESTful API following best practices
- Swagger/OpenAPI documentation
- Comprehensive API reference guide
- WebSocket events documentation
- MQTT topics documentation

#### DevOps
- Docker support with docker-compose
- Environment-based configuration
- Production-ready deployment setup
- Database migration support

### Technical Details
- Built with NestJS 10
- TypeScript for type safety
- Class-validator for request validation
- Bcrypt for password hashing
- Modular architecture for scalability

## [Unreleased]

### Planned
- Rate limiting for API endpoints
- Redis caching for performance
- Advanced analytics dashboard
- Notification preferences
- Ride history export
- Payment integration
- Advanced search and filtering
- Performance monitoring
- Automated testing suite expansion

---

For a detailed list of all changes, see the [commit history](https://github.com/u2204125/iotrix/commits/main/backend).
