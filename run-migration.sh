#!/bin/bash
# Run payment_method enum migration

echo "🔧 Running payment_method enum migration..."
echo ""

# Check if PAYMENT_DB_URL is set
if [ -z "$PAYMENT_DB_URL" ]; then
    echo "❌ ERROR: PAYMENT_DB_URL environment variable is not set"
    echo ""
    echo "Please set it first:"
    echo "  export PAYMENT_DB_URL='your-neon-db-url'"
    echo ""
    echo "Or load from .env:"
    echo "  source .env"
    exit 1
fi

echo "✅ PAYMENT_DB_URL is set"
echo "📦 Database: ${PAYMENT_DB_URL:0:30}..."
echo ""

# Check if psql is available
if command -v psql &> /dev/null; then
    echo "Using psql..."
    psql "$PAYMENT_DB_URL" -f migrate-payment-enum.sql
elif command -v node &> /dev/null; then
    echo "Using node with @neondatabase/serverless..."
    node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon(process.env.PAYMENT_DB_URL);
const migration = fs.readFileSync('migrate-payment-enum.sql', 'utf8');

async function migrate() {
  try {
    const queries = migration.split(';').filter(q => q.trim());
    for (const query of queries) {
      if (query.trim()) {
        await sql(query);
      }
    }
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
"
else
    echo "❌ Neither psql nor node is available"
    echo ""
    echo "Please install one of:"
    echo "  - PostgreSQL client (psql)"
    echo "  - Node.js"
    exit 1
fi

echo ""
echo "✅ Migration complete!"
echo "🚀 You can now deploy the updated payment service to Vercel"
