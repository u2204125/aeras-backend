import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { runSeeder } from './seeder';
import { LocationBlock } from '../entities/location-block.entity';
import { Puller } from '../entities/puller.entity';
import { PointsHistory } from '../entities/points-history.entity';
import { Admin } from '../entities/admin.entity';
import { Ride } from '../rides/ride.entity';

// Load environment variables
config();

/**
 * Seed script entry point
 * Run with: npm run seed
 */
async function main() {
  // Create data source
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [LocationBlock, Puller, PointsHistory, Ride, Admin],
    synchronize: true, // Creates tables if they don't exist
  });

  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    console.log('Database connected successfully!');

    // Run seeder
    await runSeeder(dataSource);

    console.log('\n✓ All done! Database seeded successfully.');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();
