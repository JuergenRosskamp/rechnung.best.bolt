/*
  # Tax System Improvements
  
  1. Changes to tenants table
    - `is_small_business` - Kleinunternehmerregelung § 19 UStG
    - `small_business_note` - Custom text for § 19 UStG
    - `default_vat_rate` - Standard MwSt-Satz (7, 19, or 0)
    
  2. Changes to customers table
    - `is_eu_customer` - EU-Kunde für Reverse-Charge
    - `customer_vat_id` - USt-IdNr. des Kunden
    - `country_code` - ISO Country Code
    
  3. Changes to invoices table
    - `is_reverse_charge` - Reverse-Charge Verfahren
    - `reverse_charge_note` - Custom Reverse-Charge Hinweis
    
  4. Security
    - No RLS changes needed (inherits from parent tables)
*/

-- Add fields to tenants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'is_small_business'
  ) THEN
    ALTER TABLE tenants ADD COLUMN is_small_business boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'small_business_note'
  ) THEN
    ALTER TABLE tenants ADD COLUMN small_business_note text DEFAULT 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'default_vat_rate'
  ) THEN
    ALTER TABLE tenants ADD COLUMN default_vat_rate numeric(5,2) DEFAULT 19.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'email'
  ) THEN
    ALTER TABLE tenants ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'phone'
  ) THEN
    ALTER TABLE tenants ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'website'
  ) THEN
    ALTER TABLE tenants ADD COLUMN website text;
  END IF;
END $$;

-- Add fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_eu_customer'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_eu_customer boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_vat_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_vat_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE customers ADD COLUMN country_code text DEFAULT 'DE';
  END IF;
END $$;

-- Add fields to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'is_reverse_charge'
  ) THEN
    ALTER TABLE invoices ADD COLUMN is_reverse_charge boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'reverse_charge_note'
  ) THEN
    ALTER TABLE invoices ADD COLUMN reverse_charge_note text DEFAULT 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG';
  END IF;
END $$;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Create delivery indices only if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'deliveries'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date ON deliveries(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
  END IF;
END $$;
