/**
 * Migration Script: Extend payment_method enum
 *
 * This script adds new payment methods to the PostgreSQL enum type
 * in the payment service database.
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const PAYMENT_DB_URL = process.env.PAYMENT_DB_URL;

  if (!PAYMENT_DB_URL) {
    console.error('❌ ERROR: PAYMENT_DB_URL environment variable is not set');
    console.error('');
    console.error('Please ensure .env file exists with PAYMENT_DB_URL');
    process.exit(1);
  }

  console.log('🔧 Running payment_method enum migration...');
  console.log('📦 Database:', PAYMENT_DB_URL.substring(0, 30) + '...');
  console.log('');

  const sql = neon(PAYMENT_DB_URL);

  try {
    // Add new enum values one by one
    const newValues = ['credit_card', 'bank_transfer', 'e_wallet', 'cash'];

    for (const value of newValues) {
      try {
        // PostgreSQL doesn't have IF NOT EXISTS for ALTER TYPE ADD VALUE
        // So we try to add it and catch the error if it already exists
        // Note: We need to use raw SQL string, not template literal for DDL
        await sql(`ALTER TYPE payment_method ADD VALUE '${value}'`);
        console.log(`✅ Added '${value}' to payment_method enum`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  '${value}' already exists in enum (skipping)`);
        } else {
          throw error;
        }
      }
    }

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Available payment methods:');
    console.log('   - qris (existing)');
    console.log('   - transfer (existing)');
    console.log('   - credit_card (NEW)');
    console.log('   - bank_transfer (NEW)');
    console.log('   - e_wallet (NEW)');
    console.log('   - cash (NEW)');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Deploy updated payment service to Vercel');
    console.log('   2. Run k6 tests again to verify fixes');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

migrate();
