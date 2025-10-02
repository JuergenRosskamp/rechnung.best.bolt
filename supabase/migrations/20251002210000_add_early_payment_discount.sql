/*
  # Add Early Payment Discount (Skonto)
  
  1. Changes to invoices table
    - `early_payment_discount_percentage` - Skonto Prozentsatz
    - `early_payment_discount_days` - Zahlungsfrist für Skonto
    - `early_payment_discount_amount` - Berechneter Skontobetrag
    
  2. Security
    - No RLS changes needed
*/

-- Add fields to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'early_payment_discount_percentage'
  ) THEN
    ALTER TABLE invoices ADD COLUMN early_payment_discount_percentage numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'early_payment_discount_days'
  ) THEN
    ALTER TABLE invoices ADD COLUMN early_payment_discount_days integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'early_payment_discount_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN early_payment_discount_amount numeric(15,2) DEFAULT 0;
  END IF;
END $$;
