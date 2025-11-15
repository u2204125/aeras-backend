import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

/**
 * Bootstrap function
 * Initializes and starts the NestJS application
 */
async function bootstrap() {
  // Create NestJS application
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    // origin: process.env.NODE_ENV === 'production'
    //   ? [
    //       'https://aeras-admin-panel.onrender.com',
    //       'https://aeras-admin-panel.onrender.com/'
    //     ]
    //   : '*', // Allow all origins in development
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AERAS API')
    .setDescription('AERAS - IoT-based E-Rickshaw Hailing System API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Rides', 'Ride management endpoints')
    .addTag('Pullers', 'Puller management endpoints')
    .addTag('Admin', 'Administrative endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Connect MQTT microservice
  const mqttUrl = process.env.MQTT_HOST || 'mqtt://broker.hivemq.com:1883';

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: mqttUrl,
    },
  });

  // Start all microservices
  await app.startAllMicroservices();
  console.log('MQTT microservice connected at:', mqttUrl);

  // Start HTTP server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   AERAS Backend Server is running!                       ║
  ║                                                           ║
  ║   🚀 Server:        http://localhost:${port}                  ║
  ║   📚 API Docs:      http://localhost:${port}/api-docs         ║
  ║   🔌 API Prefix:    /api/v1                               ║
  ║   📡 MQTT:          ${mqttUrl}                ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
