-- ============================================================================
-- FIX: Add missing columns to existing database
-- ============================================================================
-- This adds columns that the frontend expects but are missing in the schema
-- Run this in Supabase SQL Editor AFTER SETUP_DATABASE.sql
-- ============================================================================

-- Add deleted_at column to customers (for soft deletes)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add deleted_at column to articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add deleted_at column to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add deleted_at column to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add deleted_at column to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add deleted_at column to deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add payment_terms_days column to customers (missing from original schema)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 14;

-- Add early payment discount fields to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS early_payment_discount_percent numeric(5,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS early_payment_discount_days integer DEFAULT 7;

-- Add logo_url to invoice_layouts
ALTER TABLE invoice_layouts ADD COLUMN IF NOT EXISTS logo_url text;

-- Update existing payment_terms to payment_terms_days if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'payment_terms') THEN
    UPDATE customers SET payment_terms_days = payment_terms WHERE payment_terms_days IS NULL;
  END IF;
END $$;

-- Create indexes for deleted_at queries (performance)
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_articles_deleted_at ON articles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at ON vehicles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_deleted_at ON deliveries(deleted_at) WHERE deleted_at IS NULL;

RAISE NOTICE 'Missing columns added successfully!';
