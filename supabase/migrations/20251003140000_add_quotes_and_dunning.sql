/*
  # Angebote und Mahnsystem

  1. Neue Tabellen
    - `quotes` (Angebote)
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `customer_id` (uuid, foreign key)
      - `quote_number` (text, unique per tenant)
      - `quote_date` (date)
      - `valid_until` (date)
      - `status` (text: draft, sent, accepted, declined, expired)
      - `items` (jsonb)
      - `subtotal`, `vat_amount`, `total_amount` (numeric)
      - `notes` (text)
      - `converted_to_invoice_id` (uuid, nullable)
      - `created_by` (uuid)
      - `created_at`, `updated_at` (timestamptz)

    - `order_confirmations` (Auftragsbestätigungen)
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `quote_id` (uuid, foreign key, nullable)
      - `customer_id` (uuid, foreign key)
      - `order_number` (text, unique per tenant)
      - `order_date` (date)
      - `delivery_date` (date, nullable)
      - `status` (text: draft, confirmed, in_progress, completed, cancelled)
      - `items` (jsonb)
      - `subtotal`, `vat_amount`, `total_amount` (numeric)
      - `notes` (text)
      - `created_by` (uuid)
      - `created_at`, `updated_at` (timestamptz)

    - `dunning_notices` (Mahnungen)
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `invoice_id` (uuid, foreign key)
      - `customer_id` (uuid, foreign key)
      - `dunning_level` (integer: 1, 2, 3)
      - `dunning_number` (text, unique per tenant)
      - `dunning_date` (date)
      - `due_date` (date)
      - `original_amount` (numeric)
      - `outstanding_amount` (numeric)
      - `dunning_fee` (numeric)
      - `interest_amount` (numeric)
      - `total_amount` (numeric)
      - `status` (text: draft, sent, paid, escalated)
      - `notes` (text)
      - `created_by` (uuid)
      - `created_at`, `updated_at` (timestamptz)

    - `recurring_invoices` (Wiederkehrende Rechnungen)
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `customer_id` (uuid, foreign key)
      - `template_name` (text)
      - `frequency` (text: monthly, quarterly, yearly)
      - `start_date` (date)
      - `end_date` (date, nullable)
      - `next_invoice_date` (date)
      - `items` (jsonb)
      - `subtotal`, `vat_amount`, `total_amount` (numeric)
      - `is_active` (boolean)
      - `notes` (text)
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for tenant isolation
*/

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  vat_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  converted_to_invoice_id uuid REFERENCES invoices(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, quote_number)
);

-- Create order confirmations table
CREATE TABLE IF NOT EXISTS order_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  vat_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, order_number)
);

-- Create dunning notices table
CREATE TABLE IF NOT EXISTS dunning_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  dunning_level integer NOT NULL CHECK (dunning_level BETWEEN 1 AND 3),
  dunning_number text NOT NULL,
  dunning_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  original_amount numeric(10,2) NOT NULL,
  outstanding_amount numeric(10,2) NOT NULL,
  dunning_fee numeric(10,2) NOT NULL DEFAULT 0,
  interest_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'escalated')),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, dunning_number)
);

-- Create recurring invoices table
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  start_date date NOT NULL,
  end_date date,
  next_invoice_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  vat_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(tenant_id, quote_date DESC);

CREATE INDEX IF NOT EXISTS idx_order_confirmations_tenant ON order_confirmations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_confirmations_customer ON order_confirmations(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_confirmations_status ON order_confirmations(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_dunning_notices_tenant ON dunning_notices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dunning_notices_invoice ON dunning_notices(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dunning_notices_customer ON dunning_notices(customer_id);
CREATE INDEX IF NOT EXISTS idx_dunning_notices_level ON dunning_notices(tenant_id, dunning_level);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_tenant ON recurring_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_customer ON recurring_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_active ON recurring_invoices(tenant_id, is_active, next_invoice_date);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
DROP POLICY IF EXISTS "Users can view own tenant quotes" ON quotes;
CREATE POLICY "Users can view own tenant quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tenant quotes" ON quotes;
CREATE POLICY "Users can insert own tenant quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tenant quotes" ON quotes;
CREATE POLICY "Users can update own tenant quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for order_confirmations
DROP POLICY IF EXISTS "Users can view own tenant orders" ON order_confirmations;
CREATE POLICY "Users can view own tenant orders"
  ON order_confirmations FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tenant orders" ON order_confirmations;
CREATE POLICY "Users can insert own tenant orders"
  ON order_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tenant orders" ON order_confirmations;
CREATE POLICY "Users can update own tenant orders"
  ON order_confirmations FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for dunning_notices
DROP POLICY IF EXISTS "Users can view own tenant dunnings" ON dunning_notices;
CREATE POLICY "Users can view own tenant dunnings"
  ON dunning_notices FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tenant dunnings" ON dunning_notices;
CREATE POLICY "Users can insert own tenant dunnings"
  ON dunning_notices FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tenant dunnings" ON dunning_notices;
CREATE POLICY "Users can update own tenant dunnings"
  ON dunning_notices FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for recurring_invoices
DROP POLICY IF EXISTS "Users can view own tenant recurring invoices" ON recurring_invoices;
CREATE POLICY "Users can view own tenant recurring invoices"
  ON recurring_invoices FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tenant recurring invoices" ON recurring_invoices;
CREATE POLICY "Users can insert own tenant recurring invoices"
  ON recurring_invoices FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tenant recurring invoices" ON recurring_invoices;
CREATE POLICY "Users can update own tenant recurring invoices"
  ON recurring_invoices FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own tenant recurring invoices" ON recurring_invoices;
CREATE POLICY "Users can delete own tenant recurring invoices"
  ON recurring_invoices FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Function: Generate next quote number
CREATE OR REPLACE FUNCTION generate_quote_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_year text;
  v_count integer;
  v_number text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(CAST(substring(quote_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO v_count
  FROM quotes
  WHERE tenant_id = p_tenant_id
    AND quote_number LIKE 'AN-' || v_year || '-%';

  v_number := 'AN-' || v_year || '-' || LPAD(v_count::text, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate next order number
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_year text;
  v_count integer;
  v_number text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(CAST(substring(order_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO v_count
  FROM order_confirmations
  WHERE tenant_id = p_tenant_id
    AND order_number LIKE 'AB-' || v_year || '-%';

  v_number := 'AB-' || v_year || '-' || LPAD(v_count::text, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate next dunning number
CREATE OR REPLACE FUNCTION generate_dunning_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_year text;
  v_count integer;
  v_number text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(CAST(substring(dunning_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO v_count
  FROM dunning_notices
  WHERE tenant_id = p_tenant_id
    AND dunning_number LIKE 'MA-' || v_year || '-%';

  v_number := 'MA-' || v_year || '-' || LPAD(v_count::text, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check for overdue invoices and create dunning notices
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS void AS $$
DECLARE
  v_invoice record;
  v_tenant record;
  v_days_overdue integer;
  v_dunning_level integer;
  v_dunning_fee numeric;
  v_interest_rate numeric;
  v_interest_amount numeric;
BEGIN
  FOR v_invoice IN
    SELECT i.*, t.id as tenant_id
    FROM invoices i
    JOIN tenants t ON i.tenant_id = t.id
    WHERE i.status = 'overdue'
      AND i.outstanding_amount > 0
      AND NOT EXISTS (
        SELECT 1 FROM dunning_notices dn
        WHERE dn.invoice_id = i.id
          AND dn.status IN ('draft', 'sent')
          AND dn.dunning_date > CURRENT_DATE - INTERVAL '14 days'
      )
  LOOP
    v_days_overdue := CURRENT_DATE - v_invoice.due_date;

    IF v_days_overdue >= 42 THEN
      v_dunning_level := 3;
      v_dunning_fee := 15.00;
      v_interest_rate := 0.09;
    ELSIF v_days_overdue >= 21 THEN
      v_dunning_level := 2;
      v_dunning_fee := 10.00;
      v_interest_rate := 0.05;
    ELSIF v_days_overdue >= 7 THEN
      v_dunning_level := 1;
      v_dunning_fee := 5.00;
      v_interest_rate := 0.00;
    ELSE
      CONTINUE;
    END IF;

    v_interest_amount := v_invoice.outstanding_amount * v_interest_rate * (v_days_overdue / 365.0);

    INSERT INTO dunning_notices (
      tenant_id,
      invoice_id,
      customer_id,
      dunning_level,
      dunning_number,
      dunning_date,
      due_date,
      original_amount,
      outstanding_amount,
      dunning_fee,
      interest_amount,
      total_amount,
      status,
      created_by
    ) VALUES (
      v_invoice.tenant_id,
      v_invoice.id,
      v_invoice.customer_id,
      v_dunning_level,
      generate_dunning_number(v_invoice.tenant_id),
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '14 days',
      v_invoice.total_amount,
      v_invoice.outstanding_amount,
      v_dunning_fee,
      v_interest_amount,
      v_invoice.outstanding_amount + v_dunning_fee + v_interest_amount,
      'draft',
      v_invoice.created_by
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
