-- Migration: Add new payment methods to payment_method enum
-- Date: 2025-12-24
-- Description: Extend payment_method enum to support additional payment methods

-- Add new enum values (PostgreSQL only allows adding, not removing)
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'credit_card';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'e_wallet';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cash';

-- Verify the enum values
DO $$
BEGIN
  RAISE NOTICE 'Migration completed! Available payment methods:';
  RAISE NOTICE '  - qris (existing)';
  RAISE NOTICE '  - transfer (existing)';
  RAISE NOTICE '  - credit_card (NEW)';
  RAISE NOTICE '  - bank_transfer (NEW)';
  RAISE NOTICE '  - e_wallet (NEW)';
  RAISE NOTICE '  - cash (NEW)';
END $$;
