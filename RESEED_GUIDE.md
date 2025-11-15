# Database Reseed Guide for Render PostgreSQL

This guide explains how to clear and reupload all records in your Render PostgreSQL database.

## Overview

The `reseed` script will:
1. Connect to your Render PostgreSQL database
2. Clear all existing records from all tables
3. Upload fresh seed data (admins, location blocks, pullers)

## Prerequisites

- Node.js and npm/pnpm installed
- Access to your Render PostgreSQL database credentials
- `.env` file configured with Render database connection details

## Environment Variables

Create or update your `.env` file with your Render PostgreSQL credentials:

```bash
# Render PostgreSQL Database
DB_HOST=your-render-hostname.render.com
DB_PORT=5432
DB_USERNAME=your_database_user
DB_PASSWORD=your_secure_password
DB_DATABASE=your_database_name

# MQTT Broker
MQTT_HOST=mqtt://broker.hivemq.com:1883
MQTT_PORT=1883

# Application
PORT=3000
NODE_ENV=production
```

### Finding Your Render Database Credentials

1. Go to your Render Dashboard
2. Navigate to your PostgreSQL database
3. Click on "Info" tab
4. Copy the connection details:
   - **Internal Database URL** or **External Database URL**
   - Or individual credentials (Host, Port, Database, Username, Password)

## Running the Reseed Script

### Option 1: Using npm
```bash
npm run reseed
```

### Option 2: Using pnpm
```bash
pnpm reseed
```

### Option 3: Direct execution
```bash
npx ts-node -r tsconfig-paths/register src/database/reseed.ts
```

## What Gets Seeded

### Admins (3 users)
- **gelli_boy** - email: gelli@iotrix.com
- **samiul** - email: samiul@iotrix.com
- **saikat** - email: saikat@iotrix.com

All admin passwords: `1112`

### Location Blocks (4 blocks)
- **Pahartoli** (22.4725, 91.9845)
- **CUET_Campus** (22.4633, 91.9714)
- **Noapara** (22.4580, 91.9920)
- **Raojan** (22.4520, 91.9650)

### Pullers (5 pullers)
- Mohammad Rahman (+8801712345001) - 50 points
- Abdul Karim (+8801712345002) - 75 points
- Jamal Uddin (+8801712345003) - 30 points
- Kamal Hossain (+8801712345004) - 90 points
- Shafiq Ahmed (+8801712345005) - 45 points

### Dynamic Data
- **Riders**: Created when users request rides
- **Rides**: Created during normal operation
- **Points History**: Created when rides are completed

## Expected Output

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   AERAS Database Reseed Script                            ║
║   Render PostgreSQL Edition                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📊 Database Configuration:
   Host:     your-database.render.com
   Port:     5432
   Database: iotrix_db
   Username: your_username

⚠️  WARNING: This will DELETE all existing data!
   This action cannot be undone.

🔌 Connecting to database...
✅ Database connected successfully!

🔍 Checking database schema...
✅ Found 6 tables in database

🌱 Starting database seeding process...

Clearing existing data...
✓ Database cleared!
✓ Created admin: gelli_boy
✓ Created admin: samiul
✓ Created admin: saikat
✓ Created location block: Pahartoli
✓ Created location block: CUET_Campus
✓ Created location block: Noapara
✓ Created location block: Raojan
✓ Created puller: Mohammad Rahman (+8801712345001)
✓ Created puller: Abdul Karim (+8801712345002)
✓ Created puller: Jamal Uddin (+8801712345003)
✓ Created puller: Kamal Hossain (+8801712345004)
✓ Created puller: Shafiq Ahmed (+8801712345005)
Database seeding completed!

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✅ Database reseeded successfully!                      ║
║                                                           ║
║   Your Render PostgreSQL database is now populated       ║
║   with fresh seed data.                                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📋 Seeded Data Summary:
   • Admins:          3 users
   • Location Blocks: 4 blocks
   • Pullers:         5 pullers
   • Riders:          0 (created dynamically)
   • Rides:           0 (created dynamically)

👋 Database connection closed.
```

## Troubleshooting

### Connection Issues

If you encounter connection errors:

1. **Check SSL/TLS Settings**: Render requires SSL connections
   - The script automatically enables SSL for production environments
   
2. **Verify Credentials**: Double-check your `.env` file
   - Ensure no extra spaces in values
   - Password should be exact (case-sensitive)

3. **Network Access**: Ensure your IP can access the database
   - Render PostgreSQL is usually accessible from anywhere
   - Check if there are any firewall restrictions

4. **Database Exists**: Verify the database is running
   - Check Render dashboard for database status
   - Ensure database is not suspended

### Common Error Messages

**Error: "ENOTFOUND" or "ETIMEDOUT"**
- Check your DB_HOST is correct
- Verify internet connection
- Confirm database is running on Render

**Error: "password authentication failed"**
- Verify DB_USERNAME and DB_PASSWORD
- Check for extra spaces in .env file
- Ensure password special characters are not causing issues

**Error: "database does not exist"**
- Verify DB_DATABASE name matches your Render database
- Check spelling and case sensitivity

**Error: "relation does not exist"**
- Run migrations first: `npm run build` then start the app once
- Or enable synchronize in the script temporarily

## Safety Notes

⚠️ **WARNING**: This script will DELETE ALL DATA in your database!

- Always backup your database before running this script
- In production, consider using database snapshots
- Test the script in a development database first
- This operation cannot be undone

## Customizing Seed Data

To customize the seed data, edit the file:
```
src/database/seeder.ts
```

You can modify:
- Admin usernames, emails, passwords
- Location block coordinates and names
- Puller details and initial points
- Add more seed data as needed

## Alternative: Regular Seed Script

If you just want to seed without clearing existing data, use:
```bash
npm run seed
```

This will run the regular seed script which creates tables if they don't exist but won't clear existing data (may cause conflicts if data already exists).

## CI/CD Integration

To automatically reseed during deployment, add to your `render.yaml`:

```yaml
databases:
  - name: iotrix_db
    databaseName: iotrix_db
    user: iotrix_user

services:
  - type: web
    name: aeras-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
    # Add a pre-deploy command to reseed (optional, use with caution)
    # preDeployCommand: npm run reseed
```

**Note**: Only use `preDeployCommand: npm run reseed` if you want to reset the database on every deployment. This will delete all production data!

## Support

For issues or questions:
- Check the main README.md
- Review DATABASE_SCHEMA.md
- Contact the development team
- Open an issue on GitHub

---

**Last Updated**: November 15, 2025
