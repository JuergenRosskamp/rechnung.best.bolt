/*
  # Add Delivery Locations (Lieferorte)

  1. New Table
    - `delivery_locations`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants)
      - `customer_id` (uuid, references customers) - Which customer this location belongs to
      - `location_number` (text, unique per tenant) - Sequential numbering
      - `name` (text) - Location name/identifier
      - `contact_person` (text, optional) - Contact at this location
      - `phone` (text, optional)
      - `email` (text, optional)
      - `address_line1` (text)
      - `address_line2` (text, optional)
      - `zip_code` (text)
      - `city` (text)
      - `country` (text, default 'DE')
      - `delivery_instructions` (text, optional) - Special instructions for delivery
      - `access_notes` (text, optional) - Access codes, gate info, etc.
      - `gps_latitude` (numeric, optional) - For navigation
      - `gps_longitude` (numeric, optional) - For navigation
      - `is_active` (boolean, default true)
      - `created_at`, `updated_at` (timestamptz)

  2. Modifications
    - Add `delivery_location_id` to `invoices` table (optional)
    - Add `delivery_location_id` to `delivery_notes` table (optional)
    - Add `delivery_location_id` to `invoice_items` table (optional) - For mixed deliveries

  3. Security
    - Enable RLS on `delivery_locations`
    - Add policies for tenant-based access
    - Users can CRUD locations in their tenant

  4. Indexes
    - Index on `tenant_id` and `customer_id`
    - Index on `location_number` per tenant
*/

-- Create delivery_locations table
CREATE TABLE IF NOT EXISTS delivery_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_number text NOT NULL,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address_line1 text NOT NULL,
  address_line2 text,
  zip_code text NOT NULL,
  city text NOT NULL,
  country text DEFAULT 'DE',
  delivery_instructions text,
  access_notes text,
  gps_latitude numeric,
  gps_longitude numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, location_number)
);

-- Add delivery_location_id to invoices (for invoices tied to specific location)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'delivery_location_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN delivery_location_id uuid REFERENCES delivery_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add delivery_location_id to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'delivery_location_id'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN delivery_location_id uuid REFERENCES delivery_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add delivery_location_id to invoice_items (for mixed deliveries to different locations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'delivery_location_id'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN delivery_location_id uuid REFERENCES delivery_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_locations_tenant_id ON delivery_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_customer_id ON delivery_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_location_number ON delivery_locations(tenant_id, location_number);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_active ON delivery_locations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_invoices_delivery_location_id ON invoices(delivery_location_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_delivery_location_id ON delivery_notes(delivery_location_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_delivery_location_id ON invoice_items(delivery_location_id);

-- Enable Row Level Security
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_locations

-- Users can view delivery locations in their tenant
CREATE POLICY "Users can view delivery_locations in own tenant"
  ON delivery_locations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

-- Users can create delivery locations in their tenant
CREATE POLICY "Users can create delivery_locations in own tenant"
  ON delivery_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

-- Users can update delivery locations in their tenant
CREATE POLICY "Users can update delivery_locations in own tenant"
  ON delivery_locations FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

-- Users can delete delivery locations in their tenant
CREATE POLICY "Users can delete delivery_locations in own tenant"
  ON delivery_locations FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_delivery_locations_updated_at
  BEFORE UPDATE ON delivery_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate next location number
CREATE OR REPLACE FUNCTION generate_next_location_number(p_tenant_id uuid, p_customer_id uuid)
RETURNS text AS $$
DECLARE
  v_next_number integer;
  v_location_number text;
  v_customer_number text;
BEGIN
  -- Get customer number for prefix
  SELECT customer_number INTO v_customer_number
  FROM customers
  WHERE id = p_customer_id AND tenant_id = p_tenant_id;

  -- Get the next sequential number for this customer
  SELECT COALESCE(MAX(
    CASE
      WHEN location_number ~ '^[A-Z]+-[0-9]+$' THEN
        CAST(SUBSTRING(location_number FROM '[0-9]+$') AS integer)
      ELSE 0
    END
  ), 0) + 1 INTO v_next_number
  FROM delivery_locations
  WHERE tenant_id = p_tenant_id AND customer_id = p_customer_id;

  -- Format: CUSTOMER_NUMBER-001, CUSTOMER_NUMBER-002, etc.
  v_location_number := v_customer_number || '-' || LPAD(v_next_number::text, 3, '0');

  RETURN v_location_number;
END;
$$ LANGUAGE plpgsql;
