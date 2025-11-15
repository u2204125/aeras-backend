import { DataSource } from 'typeorm';
import { LocationBlock } from '../entities/location-block.entity';
import { Puller } from '../entities/puller.entity';
import { Admin } from '../entities/admin.entity';
import * as bcrypt from 'bcrypt';

/**
 * Database Seeder
 * Seeds initial data for development and testing
 */
export class DatabaseSeeder {
  constructor(private dataSource: DataSource) {}

  async seed() {
    console.log('Starting database seeding...');

    // Clear existing data
    await this.clearDatabase();

    await this.seedAdmins();
    await this.seedLocationBlocks();
    await this.seedPullers();

    console.log('Database seeding completed!');
  }

  /**
   * Clear all existing data
   */
  private async clearDatabase() {
    console.log('Clearing existing data...');

    // Clear in proper order to respect foreign key constraints
    await this.dataSource.query(
      'TRUNCATE TABLE "rides", "points_history", "riders", "pullers", "location_blocks", "admins" CASCADE',
    );

    console.log('✓ Database cleared!');
  }

  /**
   * Seed admin users
   */
  private async seedAdmins() {
    const adminRepository = this.dataSource.getRepository(Admin);
    const hashedPassword = await bcrypt.hash('1112', 10);

    const admins = [
      {
        username: 'gelli_boy',
        password: hashedPassword,
        email: 'gelli@iotrix.com',
        phone: '+880 1711111111',
        role: 'Administrator',
      },
      {
        username: 'samiul',
        password: hashedPassword,
        email: 'samiul@iotrix.com',
        phone: '+880 1722222222',
        role: 'Administrator',
      },
      {
        username: 'saikat',
        password: hashedPassword,
        email: 'saikat@iotrix.com',
        phone: '+880 1733333333',
        role: 'Administrator',
      },
    ];

    for (const admin of admins) {
      await adminRepository.save(admin);
      console.log(`✓ Created admin: ${admin.username}`);
    }
  }

  /**
   * Seed location blocks
   */
  private async seedLocationBlocks() {
    const locationBlockRepository = this.dataSource.getRepository(LocationBlock);

    const blocks = [
      {
        blockId: 'Pahartoli',
        destinationName: 'Pahartoli',
        latitude: 22.4725,
        longitude: 91.9845,
      },
      {
        blockId: 'CUET_Campus',
        destinationName: 'Campus',
        latitude: 22.4633,
        longitude: 91.9714,
      },
      {
        blockId: 'Noapara',
        destinationName: 'Noapara',
        latitude: 22.4580,
        longitude: 91.9920,
      },
      {
        blockId: 'Raojan',
        destinationName: 'Raojan',
        latitude: 22.4520,
        longitude: 91.9650,
      },
    ];

    for (const block of blocks) {
      await locationBlockRepository.save(block);
      console.log(`✓ Created location block: ${block.blockId}`);
    }
  }

  /**
   * Seed pullers
   */
  private async seedPullers() {
    const pullerRepository = this.dataSource.getRepository(Puller);

    const pullers = [
      {
        name: 'Mohammad Rahman',
        phone: '+8801712345001',
        pointsBalance: 50,
        isOnline: false,
        isActive: true,
        lastKnownLat: 22.46,
        lastKnownLon: 91.97,
      },
      {
        name: 'Abdul Karim',
        phone: '+8801712345002',
        pointsBalance: 75,
        isOnline: false,
        isActive: true,
        lastKnownLat: 22.36,
        lastKnownLon: 91.83,
      },
      {
        name: 'Jamal Uddin',
        phone: '+8801712345003',
        pointsBalance: 30,
        isOnline: false,
        isActive: true,
        lastKnownLat: 22.365,
        lastKnownLon: 91.81,
      },
      {
        name: 'Kamal Hossain',
        phone: '+8801712345004',
        pointsBalance: 90,
        isOnline: false,
        isActive: true,
        lastKnownLat: 22.35,
        lastKnownLon: 91.82,
      },
      {
        name: 'Shafiq Ahmed',
        phone: '+8801712345005',
        pointsBalance: 45,
        isOnline: false,
        isActive: true,
        lastKnownLat: 22.332,
        lastKnownLon: 91.8136,
      },
    ];

    for (const puller of pullers) {
      await pullerRepository.save(puller);
      console.log(`✓ Created puller: ${puller.name} (${puller.phone})`);
    }
  }
}

/**
 * Main seeder execution function
 */
export async function runSeeder(dataSource: DataSource) {
  const seeder = new DatabaseSeeder(dataSource);
  await seeder.seed();
}
