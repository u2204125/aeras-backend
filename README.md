# AERAS Backend

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![NestJS](https://img.shields.io/badge/NestJS-10.0.0-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-3178C6?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-336791?logo=postgresql)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6.0-010101?logo=socket.io)

A robust NestJS backend for the AERAS e-rickshaw hailing system with real-time communication, MQTT integration, and comprehensive REST APIs.

[Features](#features) • [Installation](#installation) • [API Docs](#api-documentation) • [Contributing](#contributing)

</div>

---

## ✨ Features

- **Ride Management**: Complete ride lifecycle from request to completion
- **Real-time Communication**: WebSocket gateway for web clients and MQTT for IoT hardware
- **Point Allocation System**: Automatic point calculation based on ride completion accuracy
- **Admin Dashboard**: Comprehensive analytics and management endpoints
- **Location-based Matching**: Haversine distance calculation for optimal puller selection
- **Database Transactions**: Ensures data consistency for critical operations
- **JWT Authentication**: Secure API access with JSON Web Tokens
- **Swagger Documentation**: Auto-generated API documentation

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | NestJS 10 |
| **Language** | TypeScript 5.1 |
| **Database** | PostgreSQL 13+ |
| **ORM** | TypeORM |
| **Real-time** | Socket.IO & MQTT |
| **Authentication** | JWT (Passport) |
| **Validation** | class-validator |
| **Documentation** | Swagger/OpenAPI |

## 📋 Prerequisites

- Node.js 18+ or Bun
- PostgreSQL 13+
- MQTT Broker (Mosquitto recommended)
- pnpm (recommended) or npm

## 🚀 Quick Start

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/u2204125/iotrix.git
cd iotrix/backend
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=aeras_user
DB_PASSWORD=your_secure_password
DB_DATABASE=aeras_db

MQTT_HOST=mqtt://localhost:1883
MQTT_PORT=1883

PORT=3000
JWT_SECRET=your_jwt_secret
```

4. **Set up PostgreSQL database:**
```bash
# Create database
createdb aeras_db

# Or using psql
psql -U postgres
CREATE DATABASE aeras_db;
CREATE USER aeras_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aeras_db TO aeras_user;
```

5. **Seed the database:**
```bash
pnpm run seed
pnpm run seed:prod # .env.production.local file is required
```

### Running the Application

**Development mode:**
```bash
pnpm run start:dev
```

**Production mode:**
```bash
pnpm build
pnpm run start:prod
```

**Debug mode:**
```bash
pnpm run start:debug
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

Access the interactive Swagger documentation at:
```
http://localhost:3000/api-docs
```

### Key Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| **Rides** | `POST /api/v1/rides/request` | Request a new ride |
| | `POST /api/v1/rides/:id/accept` | Accept a ride |
| | `POST /api/v1/rides/:id/complete` | Complete a ride |
| **Pullers** | `GET /api/v1/pullers/online` | Get online pullers |
| | `POST /api/v1/pullers/:id/location` | Update location |
| **Admin** | `GET /api/v1/admin/analytics` | Get analytics |
| | `POST /api/v1/admin/points/adjust` | Adjust points |

See [API_REFERENCE.md](API_REFERENCE.md) for complete API documentation.

## 🔌 Real-time Communication

### WebSocket Events

**Client → Server:**
- `register_puller` - Register puller connection

**Server → Client:**
- `new_ride_request` - New ride available
- `ride_update` - Ride status updated
- `notification` - General notifications

See [WEBSOCKET_REFERENCE.md](WEBSOCKET_REFERENCE.md) for details.

### MQTT Topics

**Publish:**
- `aeras/blocks/{blockId}/status` - Block status updates
- `aeras/rides/{rideId}/status` - Ride status updates

**Subscribe:**
- `aeras/requests/+/+` - Hardware ride requests
- `aeras/pullers/+/location` - Puller location updates

See [MQTT_REFERENCE.md](MQTT_REFERENCE.md) for details.

## 📁 Project Structure
- PointsHistory ↔ Puller (Many-to-One)
- PointsHistory ↔ Ride (Many-to-One, optional)

## Point Allocation System

Points are calculated when a ride is completed based on proximity to the destination:

```
Points = Base Points (10) - (Distance in meters / 10)
Minimum Points = 0
```
src/
├── admin/                # Admin module (analytics, management)
├── auth/                 # Authentication (JWT, guards)
├── entities/             # Database entities
├── location-blocks/      # Location management
├── notifications/        # WebSocket & MQTT
├── pullers/             # Puller management
├── riders/              # Rider management
├── rides/               # Ride lifecycle management
├── database/            # Seeding & migrations
├── app.module.ts        # Root module
└── main.ts              # Application entry point
```

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## 🐳 Docker Deployment

A `Dockerfile` is included for containerized deployment:

```bash
# Build image
docker build -t aeras-backend .

# Run container
docker-compose up -d
```

## 📖 Documentation

- [API Reference](API_REFERENCE.md) - Complete REST API documentation
- [WebSocket Reference](WEBSOCKET_REFERENCE.md) - WebSocket events and usage
- [MQTT Reference](MQTT_REFERENCE.md) - MQTT topics and protocols
- [Setup Guide](SETUP_GUIDE.md) - Detailed setup instructions
- [Contributing](CONTRIBUTING.md) - Contribution guidelines

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Code of conduct
- Development setup
- Coding guidelines
- Pull request process

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For security issues, please see [SECURITY.md](SECURITY.md).

## 🙏 Acknowledgments

Built with:
- [NestJS](https://nestjs.com/)
- [TypeORM](https://typeorm.io/)
- [Socket.IO](https://socket.io/)
- [MQTT.js](https://github.com/mqttjs/MQTT.js)

---

<div align="center">
Made with ❤️ for AERAS
</div>
