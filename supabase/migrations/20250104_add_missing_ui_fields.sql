/*
  # Add Missing UI Fields Migration

  ## Overview
  This migration adds all missing columns and tables that the UI expects but are not in the database.

  ## Changes

  ### 1. Customers Table
  - Add `display_name` computed column (company_name or first_name + last_name)
  - Add `total_revenue` numeric field (will be updated via trigger)
  - Add `invoice_count` integer field (will be updated via trigger)
  - Add `mobile` text field for mobile phone number
  - Add `customer_type` enum field (b2b, b2c, b2g)
  - Add `payment_terms` text field
  - Add `discount_percentage` numeric field
  - Add `internal_notes` text field
  - Add `customer_notes` text field

  ### 2. Articles Table
  - Rename `tax_rate` to include `vat_rate` as alias
  - Add `times_sold` integer field (will be updated via trigger)
  - Add `total_revenue` numeric field (will be updated via trigger)

  ### 3. Vehicles Table
  - Add `year` integer field
  - Add `status` text field with constraint
  - Add `current_mileage_km` numeric field
  - Add `next_inspection_date` date field
  - Add `next_service_due_date` date field
  - Add `assigned_driver_id` uuid field
  - Add `fuel_type` text field

  ### 4. Invoices Table
  - Add `amount_paid` as alias for `paid_amount`
  - Add `discount_amount` numeric field

  ### 5. New Table: delivery_positions
  - Complete delivery tracking system
  - Links customers, articles, and locations
  - Tracks billing status

  ### 6. Triggers
  - Auto-update customer statistics
  - Auto-update article statistics
*/

-- ============================================================================
-- 1. CUSTOMERS TABLE ENHANCEMENTS
-- ============================================================================

-- Add new columns to customers table
DO $$
BEGIN
  -- Mobile phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE customers ADD COLUMN mobile text;
  END IF;

  -- Customer type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_type text DEFAULT 'b2b'
      CHECK (customer_type IN ('b2b', 'b2c', 'b2g'));
  END IF;

  -- Payment terms
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE customers ADD COLUMN payment_terms text DEFAULT 'net_30';
  END IF;

  -- Discount percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE customers ADD COLUMN discount_percentage numeric(5,2) DEFAULT 0;
  END IF;

  -- Internal notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE customers ADD COLUMN internal_notes text;
  END IF;

  -- Customer notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_notes'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_notes text;
  END IF;

  -- Total revenue (computed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'total_revenue'
  ) THEN
    ALTER TABLE customers ADD COLUMN total_revenue numeric(12,2) DEFAULT 0;
  END IF;

  -- Invoice count (computed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'invoice_count'
  ) THEN
    ALTER TABLE customers ADD COLUMN invoice_count integer DEFAULT 0;
  END IF;

  -- Display name (computed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE customers ADD COLUMN display_name text
      GENERATED ALWAYS AS (
        COALESCE(
          company_name,
          TRIM(CONCAT(first_name, ' ', last_name))
        )
      ) STORED;
  END IF;
END $$;

-- ============================================================================
-- 2. ARTICLES TABLE ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
  -- Times sold (computed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'times_sold'
  ) THEN
    ALTER TABLE articles ADD COLUMN times_sold integer DEFAULT 0;
  END IF;

  -- Total revenue (computed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'total_revenue'
  ) THEN
    ALTER TABLE articles ADD COLUMN total_revenue numeric(12,2) DEFAULT 0;
  END IF;

  -- VAT rate (alias for tax_rate for UI compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE articles ADD COLUMN vat_rate numeric(5,2)
      GENERATED ALWAYS AS (tax_rate) STORED;
  END IF;
END $$;

-- ============================================================================
-- 3. VEHICLES TABLE ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
  -- Year
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'year'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN year integer;
  END IF;

  -- Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN status text DEFAULT 'active'
      CHECK (status IN ('active', 'maintenance', 'inactive', 'sold'));
  END IF;

  -- Current mileage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'current_mileage_km'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN current_mileage_km numeric(10,2) DEFAULT 0;
  END IF;

  -- Next inspection date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'next_inspection_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN next_inspection_date date;
  END IF;

  -- Next service due date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'next_service_due_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN next_service_due_date date;
  END IF;

  -- Assigned driver
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'assigned_driver_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN assigned_driver_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Fuel type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'fuel_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fuel_type text;
  END IF;
END $$;

-- ============================================================================
-- 4. INVOICES TABLE ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
  -- Amount paid (alias for paid_amount)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE invoices ADD COLUMN amount_paid numeric(12,2)
      GENERATED ALWAYS AS (paid_amount) STORED;
  END IF;

  -- Discount amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN discount_amount numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- 5. CREATE DELIVERY_POSITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  delivery_location_id uuid REFERENCES delivery_locations(id) ON DELETE SET NULL,
  delivery_quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  delivery_status text NOT NULL DEFAULT 'DELIVERED'
    CHECK (delivery_status IN ('DELIVERED', 'PENDING', 'CANCELLED')),
  delivery_timestamp timestamptz NOT NULL DEFAULT now(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  notes text,
  billed boolean DEFAULT false,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for delivery_positions
CREATE INDEX IF NOT EXISTS idx_delivery_positions_tenant_id ON delivery_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_customer_id ON delivery_positions(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_article_id ON delivery_positions(article_id);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_billed ON delivery_positions(tenant_id, billed);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_timestamp ON delivery_positions(delivery_timestamp);

-- Enable RLS for delivery_positions
ALTER TABLE delivery_positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_positions
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their tenant delivery positions" ON delivery_positions;
  CREATE POLICY "Users can view their tenant delivery positions"
    ON delivery_positions FOR SELECT TO authenticated
    USING (tenant_id = public.get_user_tenant_id());

  DROP POLICY IF EXISTS "Users can insert their tenant delivery positions" ON delivery_positions;
  CREATE POLICY "Users can insert their tenant delivery positions"
    ON delivery_positions FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_user_tenant_id());

  DROP POLICY IF EXISTS "Users can update their tenant delivery positions" ON delivery_positions;
  CREATE POLICY "Users can update their tenant delivery positions"
    ON delivery_positions FOR UPDATE TO authenticated
    USING (tenant_id = public.get_user_tenant_id());

  DROP POLICY IF EXISTS "Admins can delete their tenant delivery positions" ON delivery_positions;
  CREATE POLICY "Admins can delete their tenant delivery positions"
    ON delivery_positions FOR DELETE TO authenticated
    USING (tenant_id = public.get_user_tenant_id() AND public.user_is_admin());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 6. TRIGGERS FOR AUTO-UPDATING STATISTICS
-- ============================================================================

-- Function to update customer statistics
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Get customer_id from NEW or OLD
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);

  -- Update customer statistics
  UPDATE customers
  SET
    total_revenue = (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM invoices
      WHERE customer_id = v_customer_id
        AND status = 'paid'
        AND deleted_at IS NULL
    ),
    invoice_count = (
      SELECT COUNT(*)
      FROM invoices
      WHERE customer_id = v_customer_id
        AND deleted_at IS NULL
    ),
    updated_at = now()
  WHERE id = v_customer_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on invoices to update customer stats
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON invoices;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function to update article statistics
CREATE OR REPLACE FUNCTION update_article_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_article_id uuid;
BEGIN
  -- Get article_id from NEW or OLD
  v_article_id := COALESCE(NEW.article_id, OLD.article_id);

  -- Update article statistics
  UPDATE articles
  SET
    times_sold = (
      SELECT COALESCE(SUM(ii.quantity), 0)
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE ii.article_id = v_article_id
        AND i.status = 'paid'
        AND i.deleted_at IS NULL
    ),
    total_revenue = (
      SELECT COALESCE(SUM(ii.line_total), 0)
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE ii.article_id = v_article_id
        AND i.status = 'paid'
        AND i.deleted_at IS NULL
    ),
    updated_at = now()
  WHERE id = v_article_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on invoice_items to update article stats
DROP TRIGGER IF EXISTS trigger_update_article_stats ON invoice_items;
CREATE TRIGGER trigger_update_article_stats
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_article_stats();

-- Trigger for delivery_positions updated_at
DROP TRIGGER IF EXISTS update_delivery_positions_updated_at ON delivery_positions;
CREATE TRIGGER update_delivery_positions_updated_at
  BEFORE UPDATE ON delivery_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. UPDATE EXISTING DATA
-- ============================================================================

-- Initialize customer statistics for existing data
UPDATE customers c
SET
  total_revenue = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM invoices
    WHERE customer_id = c.id
      AND status = 'paid'
      AND deleted_at IS NULL
  ),
  invoice_count = (
    SELECT COUNT(*)
    FROM invoices
    WHERE customer_id = c.id
      AND deleted_at IS NULL
  );

-- Initialize article statistics for existing data
UPDATE articles a
SET
  times_sold = (
    SELECT COALESCE(SUM(ii.quantity), 0)
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE ii.article_id = a.id
      AND i.status = 'paid'
      AND i.deleted_at IS NULL
  ),
  total_revenue = (
    SELECT COALESCE(SUM(ii.line_total), 0)
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE ii.article_id = a.id
      AND i.status = 'paid'
      AND i.deleted_at IS NULL
  );

-- ============================================================================
-- DONE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'UI Fields Migration Complete!';
  RAISE NOTICE 'Added missing columns and tables';
  RAISE NOTICE 'Created triggers for auto-updating stats';
  RAISE NOTICE '============================================';
END $$;
