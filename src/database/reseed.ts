import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { runSeeder } from './seeder';
import { LocationBlock } from '../entities/location-block.entity';
import { Puller } from '../entities/puller.entity';
import { PointsHistory } from '../entities/points-history.entity';
import { Admin } from '../entities/admin.entity';
import { Rider } from '../entities/rider.entity';
import { Ride } from '../rides/ride.entity';
import * as path from 'path';

// Load environment variables from .env.production.local
config({ path: path.resolve(__dirname, '../../.env.production.local') });

/**
 * Reseed script for Render PostgreSQL
 * This script will:
 * 1. Connect to the Render PostgreSQL database
 * 2. Clear all existing records
 * 3. Reupload fresh seed data
 * 
 * Run with: npm run reseed
 * 
 * For Render PostgreSQL, make sure you have set the following environment variables:
 * - DB_HOST (Render PostgreSQL hostname)
 * - DB_PORT (usually 5432)
 * - DB_USERNAME (Render database username)
 * - DB_PASSWORD (Render database password)
 * - DB_DATABASE (Render database name)
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   AERAS Database Reseed Script                            ║');
  console.log('║   Render PostgreSQL Edition                               ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Display connection info (without password)
  console.log('📊 Database Configuration:');
  console.log(`   Host:     ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   Port:     ${process.env.DB_PORT || '5432'}`);
  console.log(`   Database: ${process.env.DB_DATABASE || 'iotrix_db'}`);
  console.log(`   Username: ${process.env.DB_USERNAME || 'username'}`);
  console.log('');

  // Confirm before proceeding
  console.log('⚠️  WARNING: This will DELETE all existing data!');
  console.log('   This action cannot be undone.\n');

  // Create data source with SSL for Render PostgreSQL
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [LocationBlock, Puller, PointsHistory, Rider, Ride, Admin],
    synchronize: false, // Don't auto-sync schema, just work with existing tables
    ssl: {
      rejectUnauthorized: false // Required for Render PostgreSQL
    },
    logging: false, // Disable query logging for cleaner output
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected successfully!\n');

    // Check if tables exist
    console.log('🔍 Checking database schema...');
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found! Creating schema...');
      // If no tables exist, we need to create them
      await dataSource.synchronize();
      console.log('✅ Schema created successfully!\n');
    } else {
      console.log(`✅ Found ${tables.length} tables in database\n`);
    }

    // Run seeder (this will clear and reseed)
    console.log('🌱 Starting database seeding process...\n');
    await runSeeder(dataSource);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   ✅ Database reseeded successfully!                      ║');
    console.log('║                                                           ║');
    console.log('║   Your Render PostgreSQL database is now populated       ║');
    console.log('║   with fresh seed data.                                  ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('📋 Seeded Data Summary:');
    console.log('   • Admins:          3 users');
    console.log('   • Location Blocks: 4 blocks');
    console.log('   • Pullers:         5 pullers');
    console.log('   • Riders:          0 (created dynamically)');
    console.log('   • Rides:           0 (created dynamically)\n');

  } catch (error) {
    console.error('\n❌ Error during reseeding:');
    console.error(error);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Check your .env.production.local file has correct Render database credentials');
    console.log('   2. Verify Render PostgreSQL is accessible');
    console.log('   3. Ensure your IP is whitelisted (if required)');
    console.log('   4. Check database connection string format\n');
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed.');
  }
}

// Run the script
main();
