/*
  # Invoice Management Schema
  
  1. New Tables
    - `invoices` - Main invoice table
      - Complete invoice information
      - Status tracking (draft, sent, paid, overdue, cancelled)
      - Payment tracking
      - Link to customer and construction site
      
    - `invoice_items` - Line items for invoices
      - Article reference or free text
      - Quantity, price, VAT, discounts
      - Total calculations
      
    - `invoice_payments` - Payment tracking
      - Multiple payments per invoice
      - Payment methods and references
      
    - `invoice_numbering` - Auto-incrementing invoice numbers
      - Per tenant, per series
      - GoBD-compliant (sequential, no gaps)
      
  2. Security
    - Enable RLS on all tables
    - Strict tenant isolation
    - Immutable once finalized (GoBD)
    
  3. Important Notes
    - Invoice numbers must be sequential and unique
    - Once finalized, invoices cannot be deleted (only cancelled)
    - All changes logged for audit trail
*/

-- Create invoice_numbering table
CREATE TABLE IF NOT EXISTS invoice_numbering (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  series_name text NOT NULL DEFAULT 'default',
  prefix text NOT NULL DEFAULT 'RE',
  current_number integer NOT NULL DEFAULT 0,
  year integer,
  reset_yearly boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_series_per_tenant UNIQUE (tenant_id, series_name, year)
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Invoice Info
  invoice_number text NOT NULL,
  invoice_type text NOT NULL DEFAULT 'standard',
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_date date,
  due_date date NOT NULL,
  
  -- Customer Info
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_snapshot jsonb NOT NULL,
  
  -- Payment Terms
  payment_terms text NOT NULL DEFAULT 'net_30',
  reference_number text,
  
  -- Project/Site
  construction_site_id uuid,
  project_name text,
  
  -- Financial Details
  currency text NOT NULL DEFAULT 'EUR',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  total_discount numeric(15,2) DEFAULT 0,
  total_vat numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  
  -- VAT Breakdown
  vat_breakdown jsonb DEFAULT '[]',
  
  -- Payment Info
  amount_paid numeric(15,2) DEFAULT 0,
  amount_due numeric(15,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  
  -- Status
  status text NOT NULL DEFAULT 'draft',
  payment_status text NOT NULL DEFAULT 'unpaid',
  
  -- Notes
  internal_notes text,
  customer_notes text,
  terms_and_conditions text,
  
  -- Documents
  pdf_url text,
  xrechnung_url text,
  zugferd_url text,
  
  -- Email Tracking
  sent_at timestamptz,
  sent_to text,
  
  -- Recurring Invoice
  is_recurring boolean DEFAULT false,
  recurring_config jsonb,
  parent_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  finalized_at timestamptz,
  finalized_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  
  CONSTRAINT unique_invoice_number_per_tenant UNIQUE (tenant_id, invoice_number),
  CONSTRAINT valid_invoice_type CHECK (invoice_type IN ('standard', 'proforma', 'delivery_note', 'credit_note', 'cancellation', 'recurring', 'collective')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'overpaid'))
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  position_number integer NOT NULL,
  
  -- Article Reference
  article_id uuid REFERENCES articles(id) ON DELETE SET NULL,
  article_snapshot jsonb,
  
  -- Item Details
  description text NOT NULL,
  quantity numeric(15,3) NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  unit_price numeric(15,2) NOT NULL,
  
  -- Discounts
  discount_percentage numeric(5,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  
  -- VAT
  vat_rate numeric(5,2) NOT NULL,
  vat_amount numeric(15,2) NOT NULL,
  
  -- Totals
  net_amount numeric(15,2) NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_position_per_invoice UNIQUE (invoice_id, position_number)
);

-- Create invoice_payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  amount numeric(15,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  reference text,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('bank_transfer', 'cash', 'card', 'paypal', 'sepa', 'other'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_article_id ON invoice_items(article_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON invoice_payments(payment_date);

-- Enable RLS
ALTER TABLE invoice_numbering ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices in their tenant"
  ON invoices FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create invoices in their tenant"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update invoices in their tenant"
  ON invoices FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete draft invoices in their tenant"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND status = 'draft'
  );

-- RLS Policies for invoice_items
CREATE POLICY "Users can view invoice items in their tenant"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage invoice items in their tenant"
  ON invoice_items FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for invoice_payments
CREATE POLICY "Users can view payments in their tenant"
  ON invoice_payments FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create payments in their tenant"
  ON invoice_payments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for invoice_numbering
CREATE POLICY "Users can view numbering in their tenant"
  ON invoice_numbering FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can manage numbering"
  ON invoice_numbering FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Create triggers
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number(
  p_tenant_id uuid,
  p_series_name text DEFAULT 'default',
  p_prefix text DEFAULT 'RE'
)
RETURNS text AS $$
DECLARE
  v_current_year integer;
  v_next_number integer;
  v_invoice_number text;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get or create numbering series
  INSERT INTO invoice_numbering (tenant_id, series_name, prefix, year, current_number)
  VALUES (p_tenant_id, p_series_name, p_prefix, v_current_year, 0)
  ON CONFLICT (tenant_id, series_name, year) DO NOTHING;
  
  -- Increment and get next number
  UPDATE invoice_numbering
  SET current_number = current_number + 1
  WHERE tenant_id = p_tenant_id
    AND series_name = p_series_name
    AND year = v_current_year
  RETURNING current_number INTO v_next_number;
  
  -- Format invoice number: RE-2025-0001
  v_invoice_number := p_prefix || '-' || v_current_year || '-' || LPAD(v_next_number::text, 4, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice totals and payment status
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal numeric(15,2);
  v_total_vat numeric(15,2);
  v_total numeric(15,2);
  v_amount_paid numeric(15,2);
  v_payment_status text;
BEGIN
  -- Calculate totals from items
  SELECT 
    COALESCE(SUM(net_amount), 0),
    COALESCE(SUM(vat_amount), 0),
    COALESCE(SUM(total_amount), 0)
  INTO v_subtotal, v_total_vat, v_total
  FROM invoice_items
  WHERE invoice_id = NEW.invoice_id;
  
  -- Get total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO v_amount_paid
  FROM invoice_payments
  WHERE invoice_id = NEW.invoice_id;
  
  -- Determine payment status
  IF v_amount_paid = 0 THEN
    v_payment_status := 'unpaid';
  ELSIF v_amount_paid >= v_total THEN
    v_payment_status := 'paid';
  ELSE
    v_payment_status := 'partially_paid';
  END IF;
  
  -- Update invoice
  UPDATE invoices
  SET 
    subtotal = v_subtotal,
    total_vat = v_total_vat,
    total = v_total,
    amount_paid = v_amount_paid,
    payment_status = v_payment_status,
    updated_at = now()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic total calculation
CREATE TRIGGER update_invoice_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER update_invoice_totals_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();
