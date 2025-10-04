-- ============================================================================
-- RECHNUNG.BEST - COMPLETE DATABASE SETUP
-- ============================================================================
-- Apply this SQL in Supabase SQL Editor:
-- 1. Go to: https://0ec90b57d6e95fcbda19832f.supabase.co
-- 2. Click: SQL Editor (left menu)
-- 3. Paste this entire file
-- 4. Click: Run
-- ============================================================================

-- First, let's check if tables exist
DO $$
BEGIN
  RAISE NOTICE 'Starting database setup...';
END $$;

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS dunning_log CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS monthly_closings CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS cashbook CASCADE;
DROP TABLE IF EXISTS invoice_payments CASCADE;
DROP TABLE IF EXISTS invoice_archive CASCADE;
DROP TABLE IF EXISTS invoice_layouts CASCADE;
DROP TABLE IF EXISTS delivery_items CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS recurring_invoices CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS delivery_locations CASCADE;
DROP TABLE IF EXISTS customer_price_overrides CASCADE;
DROP TABLE IF EXISTS article_time_based_prices CASCADE;
DROP TABLE IF EXISTS article_volume_discounts CASCADE;
DROP TABLE IF EXISTS customer_contacts CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.generate_invoice_number(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_cashbook_entry() CASCADE;
DROP FUNCTION IF EXISTS public.close_cashbook_month(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_invoice_totals() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.user_is_admin() CASCADE;

-- ============================================================================
-- CORE SCHEMA: Tenants, Users, Subscriptions
-- ============================================================================

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  address_line1 text,
  address_line2 text,
  zip_code text,
  city text,
  country text DEFAULT 'DE',
  tax_id text,
  vat_id text,
  logo_url text,
  bank_name text,
  bank_account_holder text,
  iban text,
  bic text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY, -- Linked to auth.users.id (same UUID, no FK)
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'office',
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'office', 'driver'))
);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'rechnung.best',
  status text NOT NULL DEFAULT 'active',
  trial_ends_at timestamptz,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '1 year'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('basic_kasse', 'basic_invoice', 'rechnung.best')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'paused'))
);

-- ============================================================================
-- BUSINESS DATA: Customers, Articles, Vehicles
-- ============================================================================

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  zip_code text,
  city text,
  country text DEFAULT 'DE',
  tax_id text,
  vat_id text,
  notes text,
  payment_terms integer DEFAULT 14,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, customer_number)
);

CREATE TABLE customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  position text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  article_number text NOT NULL,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'Stück',
  base_price numeric(10, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 19.00,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, article_number)
);

CREATE TABLE article_volume_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  min_quantity integer NOT NULL,
  discount_percentage numeric(5, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

CREATE TABLE article_time_based_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  valid_from date NOT NULL,
  valid_to date,
  price numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE customer_price_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  override_price numeric(10, 2) NOT NULL,
  valid_from date,
  valid_to date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, article_id)
);

CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  license_plate text NOT NULL,
  vehicle_type text NOT NULL,
  brand text,
  model text,
  capacity_kg numeric(10, 2),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, license_plate)
);

CREATE TABLE delivery_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  zip_code text NOT NULL,
  city text NOT NULL,
  country text DEFAULT 'DE',
  contact_person text,
  contact_phone text,
  delivery_notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INVOICING SYSTEM
-- ============================================================================

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_type text NOT NULL DEFAULT 'invoice',
  invoice_number text,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(10, 2) NOT NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  early_payment_discount_percentage numeric(5, 2) DEFAULT 0,
  early_payment_discount_days integer DEFAULT 0,
  early_payment_discount_amount numeric(10, 2) DEFAULT 0,
  notes text,
  internal_notes text,
  payment_terms text,
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_invoice_type CHECK (invoice_type IN ('invoice', 'credit_note', 'cancellation')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  UNIQUE(tenant_id, invoice_number)
);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL,
  unit text NOT NULL DEFAULT 'Stück',
  unit_price numeric(10, 2) NOT NULL,
  discount_percentage numeric(5, 2) DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 19.00,
  line_total numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  frequency text NOT NULL,
  next_invoice_date date NOT NULL,
  last_invoice_date date,
  is_active boolean DEFAULT true,
  invoice_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_frequency CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly'))
);

CREATE TABLE invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10, 2) NOT NULL,
  payment_method text NOT NULL,
  reference text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE invoice_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  pdf_data bytea NOT NULL,
  metadata jsonb,
  hash text NOT NULL,
  UNIQUE(tenant_id, invoice_number)
);

CREATE TABLE invoice_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  layout_name text NOT NULL,
  is_default boolean DEFAULT false,
  header_html text,
  footer_html text,
  styles jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, layout_name)
);

-- ============================================================================
-- DELIVERY MANAGEMENT
-- ============================================================================

CREATE TABLE deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  delivery_location_id uuid REFERENCES delivery_locations(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  delivery_number text NOT NULL,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'planned',
  driver_name text,
  notes text,
  signature_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_delivery_status CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  UNIQUE(tenant_id, delivery_number)
);

CREATE TABLE delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  quantity numeric(10, 2) NOT NULL,
  unit text NOT NULL DEFAULT 'Stück',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CASHBOOK (GoBD Compliant)
-- ============================================================================

-- Create receipts table BEFORE cashbook (cashbook references receipts)
CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  ocr_data jsonb,
  upload_date timestamptz DEFAULT now(),
  uploaded_by uuid NOT NULL REFERENCES users(id),
  UNIQUE(tenant_id, receipt_number)
);

CREATE TABLE cashbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_number serial,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_type text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 19.00,
  tax_amount numeric(10, 2) NOT NULL,
  description text NOT NULL,
  category text,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
  is_cancelled boolean DEFAULT false,
  cancelled_by uuid,
  cancelled_at timestamptz,
  cancellation_reason text,
  month_closed boolean DEFAULT false,
  closing_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id),
  CONSTRAINT valid_entry_type CHECK (entry_type IN ('income', 'expense', 'opening_balance'))
);

CREATE TABLE monthly_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  closing_year integer NOT NULL,
  closing_month integer NOT NULL,
  opening_balance numeric(10, 2) NOT NULL,
  total_income numeric(10, 2) NOT NULL,
  total_expenses numeric(10, 2) NOT NULL,
  closing_balance numeric(10, 2) NOT NULL,
  entry_count integer NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid NOT NULL REFERENCES users(id),
  report_data jsonb,
  UNIQUE(tenant_id, closing_year, closing_month)
);

-- ============================================================================
-- QUOTES & DUNNING
-- ============================================================================

CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  quote_number text NOT NULL,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(10, 2) NOT NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  notes text,
  internal_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_quote_status CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  UNIQUE(tenant_id, quote_number)
);

CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL,
  unit text NOT NULL DEFAULT 'Stück',
  unit_price numeric(10, 2) NOT NULL,
  discount_percentage numeric(5, 2) DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 19.00,
  line_total numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE dunning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  dunning_level integer NOT NULL,
  dunning_date date NOT NULL DEFAULT CURRENT_DATE,
  dunning_fee numeric(10, 2) DEFAULT 0,
  sent_via text,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dunning_level CHECK (dunning_level BETWEEN 1 AND 3)
);

-- ============================================================================
-- SUPPORT SYSTEM
-- ============================================================================

CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  category text NOT NULL,
  assigned_to uuid,
  resolution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT valid_ticket_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_number ON customers(tenant_id, customer_number);
CREATE INDEX idx_articles_tenant_id ON articles(tenant_id);
CREATE INDEX idx_articles_number ON articles(tenant_id, article_number);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_deliveries_tenant_id ON deliveries(tenant_id);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX idx_cashbook_tenant_id ON cashbook(tenant_id);
CREATE INDEX idx_cashbook_date ON cashbook(entry_date);
CREATE INDEX idx_cashbook_closing ON cashbook(tenant_id, month_closed);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Invoice number generator
CREATE OR REPLACE FUNCTION generate_invoice_number(p_tenant_id uuid, p_prefix text DEFAULT 'RE')
RETURNS text AS $$
DECLARE
  v_year text;
  v_count integer;
  v_number text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE);

  v_number := p_prefix || v_year || '-' || LPAD(v_count::text, 5, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Cashbook validation
CREATE OR REPLACE FUNCTION validate_cashbook_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.month_closed THEN
    RAISE EXCEPTION 'Cannot modify entries in closed months';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Invoice totals calculator
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal numeric(10, 2);
  v_tax_amount numeric(10, 2);
  v_total numeric(10, 2);
BEGIN
  SELECT
    COALESCE(SUM(line_total), 0),
    COALESCE(SUM(line_total * tax_rate / 100), 0)
  INTO v_subtotal, v_tax_amount
  FROM invoice_items
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  v_total := v_subtotal + v_tax_amount;

  UPDATE invoices
  SET
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total_amount = v_total
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cashbook validation trigger
CREATE TRIGGER validate_cashbook_before_change
  BEFORE INSERT OR UPDATE OR DELETE ON cashbook
  FOR EACH ROW EXECUTE FUNCTION validate_cashbook_entry();

-- Invoice totals triggers
CREATE TRIGGER update_invoice_totals_on_item_insert
  AFTER INSERT ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER update_invoice_totals_on_item_update
  AFTER UPDATE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER update_invoice_totals_on_item_delete
  AFTER DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_volume_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_time_based_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS (in public schema, not auth)
-- ============================================================================
-- These functions bypass RLS to prevent infinite recursion in policies
-- They are marked SECURITY DEFINER so they run with elevated privileges

-- Helper function to get user's tenant_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

-- Helper function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Security note: Revoke execute from public/anon for safety
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.user_is_admin() TO authenticated;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for tenants
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Admins can update their own tenant"
  ON tenants FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id() AND public.user_is_admin());

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their tenant subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can update their tenant subscription"
  ON subscriptions FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.user_is_admin())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_is_admin());

-- RLS Policies for all tenant-scoped tables (template)
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('tenants', 'users', 'subscriptions')
  LOOP
    BEGIN
      EXECUTE format('
        CREATE POLICY "Users can view their tenant data"
          ON %I FOR SELECT TO authenticated
          USING (tenant_id = public.get_user_tenant_id());
      ', table_name);

      EXECUTE format('
        CREATE POLICY "Users can insert their tenant data"
          ON %I FOR INSERT TO authenticated
          WITH CHECK (tenant_id = public.get_user_tenant_id());
      ', table_name);

      EXECUTE format('
        CREATE POLICY "Users can update their tenant data"
          ON %I FOR UPDATE TO authenticated
          USING (tenant_id = public.get_user_tenant_id());
      ', table_name);

      EXECUTE format('
        CREATE POLICY "Admins can delete their tenant data"
          ON %I FOR DELETE TO authenticated
          USING (tenant_id = public.get_user_tenant_id() AND public.user_is_admin());
      ', table_name);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_column THEN
        RAISE NOTICE 'Table % does not have tenant_id column, skipping RLS policies', table_name;
    END;
  END LOOP;
END $$;

-- Special RLS for related tables
CREATE POLICY "Users can view customer contacts"
  ON customer_contacts FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE tenant_id = public.get_user_tenant_id()));

CREATE POLICY "Users can manage customer contacts"
  ON customer_contacts FOR ALL TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE tenant_id = public.get_user_tenant_id()));

-- ============================================================================
-- STORAGE BUCKET FOR RECEIPTS
-- ============================================================================

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('receipts', 'receipts', false)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created storage bucket: receipts';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage bucket already exists or error: %', SQLERRM;
END $$;

-- Storage policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their receipts" ON storage.objects;

  CREATE POLICY "Users can upload receipts"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'receipts');

  CREATE POLICY "Users can view their receipts"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'receipts');

  CREATE POLICY "Users can delete their receipts"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'receipts');

  RAISE NOTICE 'Created storage policies';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage policies: %', SQLERRM;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Database setup complete!';
  RAISE NOTICE 'Next step: Run the test data script';
  RAISE NOTICE '============================================';
END $$;
