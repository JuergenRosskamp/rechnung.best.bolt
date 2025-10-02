/*
  # Add Bank Account Details to Tenants

  1. Changes
    - Add bank account fields to tenants table:
      - `bank_name` - Name of the bank
      - `bank_account_holder` - Account holder name
      - `iban` - International Bank Account Number
      - `bic` - Bank Identifier Code
      - `bank_notes` - Additional notes about banking
  
  2. Security
    - No RLS changes needed (inherits from tenants table)
*/

-- Add bank account fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE tenants ADD COLUMN bank_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'bank_account_holder'
  ) THEN
    ALTER TABLE tenants ADD COLUMN bank_account_holder text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'iban'
  ) THEN
    ALTER TABLE tenants ADD COLUMN iban text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'bic'
  ) THEN
    ALTER TABLE tenants ADD COLUMN bic text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'bank_notes'
  ) THEN
    ALTER TABLE tenants ADD COLUMN bank_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'phone'
  ) THEN
    ALTER TABLE tenants ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'email'
  ) THEN
    ALTER TABLE tenants ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'website'
  ) THEN
    ALTER TABLE tenants ADD COLUMN website text;
  END IF;
END $$;
