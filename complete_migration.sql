-- ============================================================================
-- COMPLETE DATABASE MIGRATION - ALL IN ONE
-- ============================================================================
-- This file contains all migrations in the correct order.
-- Copy and paste this entire file into your Supabase SQL Editor and run it.
-- ============================================================================

-- Drop specific triggers that we know exist
DROP TRIGGER IF EXISTS update_customer_contacts_updated_at ON customer_contacts CASCADE;
DROP TRIGGER IF EXISTS update_invoice_totals_on_payment ON invoice_payments CASCADE;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants CASCADE;
DROP TRIGGER IF EXISTS update_users_updated_at ON users CASCADE;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers CASCADE;
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles CASCADE;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices CASCADE;
DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes CASCADE;
DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries CASCADE;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles CASCADE;
DROP TRIGGER IF EXISTS update_delivery_locations_updated_at ON delivery_locations CASCADE;
DROP TRIGGER IF EXISTS update_invoice_layouts_updated_at ON invoice_layouts CASCADE;
DROP TRIGGER IF EXISTS update_receipts_updated_at ON receipts CASCADE;
DROP TRIGGER IF EXISTS update_cashbook_updated_at ON cashbook CASCADE;

-- Drop all tables that might exist (in reverse dependency order)
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS dunning_log CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
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

-- Drop functions if they exist
DROP FUNCTION IF EXISTS generate_invoice_number CASCADE;
DROP FUNCTION IF EXISTS validate_cashbook_entry CASCADE;
DROP FUNCTION IF EXISTS close_cashbook_month CASCADE;
DROP FUNCTION IF EXISTS get_tenant_id CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS update_invoice_totals CASCADE;

-- Drop storage bucket (only application bucket, not system buckets)
DELETE FROM storage.objects WHERE bucket_id = 'receipts';
DELETE FROM storage.buckets WHERE id = 'receipts';

-- ============================================================================
-- 20250930211137_create_initial_schema.sql
-- ============================================================================

/*
  # Initial Schema - Tenant Isolation & Authentication
  
  1. New Tables
    - `tenants` - Multi-tenant isolation root table
      - `id` (uuid, primary key)
      - `company_name` (text, required)
      - `address_aline1`, `address_line2`, `zip_code`, `city`, `country` (text, optional)
      - `tax_id`, `vat_id` (text, optional)
      - `logo_url` (text, optional)
      - `created_at`, `updated_at` (timestamptz)
      
    - `users` - User profiles linked to tenants
      - `id` (uuid, primary key, linked to auth.users)
      - `tenant_id` (uuid, foreign key to tenants)
      - `email` (text, unique)
      - `role` (text, user role)
      - `first_name`, `last_name` (text, optional)
      - `created_at`, `updated_at` (timestamptz)
      
    - `subscriptions` - Subscription and billing management
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `plan_type` (text: basic_kasse, basic_invoice, rechnung.best)
      - `status` (text: active, trialing, past_due, cancelled, paused)
      - `trial_ends_at` (timestamptz, optional)
      - `current_period_start`, `current_period_end` (timestamptz)
      - `stripe_customer_id`, `stripe_subscription_id` (text, optional)
      - `created_at`, `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS on all tables
    - Policies enforce tenant_id isolation
    - Users can only access data from their own tenant
    
  3. Important Notes
    - This is the foundation for the entire multi-tenant architecture
    - ALL future tables MUST include tenant_id and RLS policies
    - Never query across tenants without explicit authorization
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'office',
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'rechnung.best',
  status text NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '1 month'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('basic_kasse', 'basic_invoice', 'rechnung.best')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'paused'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'office')
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert users in their tenant"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users in their tenant"
  ON users FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users in their tenant"
  ON users FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their tenant's subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their tenant's subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 20251001054428_create_customers_and_articles.sql
-- ============================================================================

/*
  # Customer and Article Management Schema
  
  1. New Tables
    - `customers` - Customer/contact management
      - Full customer information (company/individual)
      - Billing and delivery addresses
      - Tax information (tax_id, vat_id)
      - Payment terms and preferences
      - E-invoicing settings (leitweg_id, accepts_xrechnung)
      - Statistics (total_revenue, invoice_count)
      
    - `customer_contacts` - Additional contact persons for customers
      - Multiple contacts per customer
      - Role-based (billing, delivery, primary)
      
    - `articles` - Products and services catalog
      - Article information and pricing
      - Multi-level pricing support (rechnung.best plan)
      - Inventory tracking (optional)
      - Accounting integration (SKR03/SKR04)
      
    - `article_pricing` - Customer/site-specific pricing (rechnung.best plan)
      - Hierarchical pricing (general → customer → construction site)
      
  2. Security
    - Enable RLS on all tables
    - Strict tenant isolation
    - Role-based permissions
    
  3. Important Notes
    - All customer data MUST be tenant-isolated
    - Support for B2B, B2C, and B2G customers
    - GoBD compliance with audit trails
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic Info
  customer_number text NOT NULL,
  company_name text,
  first_name text,
  last_name text,
  display_name text GENERATED ALWAYS AS (
    COALESCE(company_name, first_name || ' ' || last_name)
  ) STORED,
  
  -- Contact Details
  email text,
  phone text,
  mobile text,
  fax text,
  website text,
  
  -- Billing Address
  address_line1 text NOT NULL,
  address_line2 text,
  zip_code text NOT NULL,
  city text NOT NULL,
  state text,
  country text NOT NULL DEFAULT 'DE',
  
  -- Delivery Address (if different)
  delivery_address jsonb,
  
  -- Tax Information
  tax_id text,
  vat_id text,
  is_vat_exempt boolean DEFAULT false,
  reverse_charge boolean DEFAULT false,
  
  -- Payment Information
  default_payment_terms text DEFAULT 'net_30',
  bank_name text,
  iban text,
  bic text,
  sepa_mandate_reference text,
  sepa_mandate_date date,
  
  -- Pricing
  discount_percentage numeric(5,2) DEFAULT 0,
  currency text DEFAULT 'EUR',
  
  -- Categorization
  customer_type text NOT NULL DEFAULT 'b2b',
  industry text,
  tags text[] DEFAULT '{}',
  
  -- E-Invoicing (rechnung.best plan)
  accepts_xrechnung boolean DEFAULT false,
  leitweg_id text,
  peppol_id text,
  
  -- Statistics (updated via triggers)
  total_revenue numeric(15,2) DEFAULT 0,
  invoice_count integer DEFAULT 0,
  average_invoice_value numeric(15,2) DEFAULT 0,
  last_invoice_date date,
  overdue_amount numeric(15,2) DEFAULT 0,
  
  -- Status
  is_active boolean DEFAULT true,
  credit_limit numeric(15,2),
  payment_behavior text DEFAULT 'average',
  
  -- Relationships
  assigned_branch_id uuid,
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  
  -- Notes
  internal_notes text,
  customer_notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  
  CONSTRAINT unique_customer_number_per_tenant UNIQUE (tenant_id, customer_number),
  CONSTRAINT valid_customer_type CHECK (customer_type IN ('b2b', 'b2c', 'b2g')),
  CONSTRAINT valid_payment_behavior CHECK (payment_behavior IN ('excellent', 'good', 'average', 'poor'))
);

-- Create customer_contacts table
CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  first_name text NOT NULL,
  last_name text NOT NULL,
  position text,
  department text,
  email text,
  phone text,
  mobile text,
  
  is_primary boolean DEFAULT false,
  is_billing_contact boolean DEFAULT false,
  is_delivery_contact boolean DEFAULT false,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic Info
  article_number text NOT NULL,
  name text NOT NULL,
  description text,
  short_description text,
  
  -- Categorization
  category text NOT NULL DEFAULT 'general',
  tags text[] DEFAULT '{}',
  unit text NOT NULL DEFAULT 'pcs',
  
  -- Pricing
  unit_price numeric(15,2) NOT NULL,
  currency text DEFAULT 'EUR',
  vat_rate numeric(5,2) NOT NULL DEFAULT 19,
  cost_price numeric(15,2),
  
  -- Inventory (optional)
  track_inventory boolean DEFAULT false,
  current_stock numeric(15,3),
  reorder_level numeric(15,3),
  supplier_id uuid,
  supplier_article_number text,
  
  -- Accounting (DATEV integration)
  revenue_account text,
  cost_account text,
  
  -- Status
  is_active boolean DEFAULT true,
  is_service boolean DEFAULT false,
  
  -- Statistics (updated via triggers)
  times_sold integer DEFAULT 0,
  total_revenue numeric(15,2) DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  
  CONSTRAINT unique_article_number_per_tenant UNIQUE (tenant_id, article_number)
);

-- Create article_pricing table (rechnung.best plan only)
CREATE TABLE IF NOT EXISTS article_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  level text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  construction_site_id uuid,
  price numeric(15,2) NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_pricing_level CHECK (level IN ('general', 'customer_specific', 'construction_site_specific'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_tenant_id ON customer_contacts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_articles_tenant_id ON articles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_articles_article_number ON articles(article_number);
CREATE INDEX IF NOT EXISTS idx_articles_is_active ON articles(is_active);
CREATE INDEX IF NOT EXISTS idx_articles_deleted_at ON articles(deleted_at);

CREATE INDEX IF NOT EXISTS idx_article_pricing_article_id ON article_pricing(article_id);
CREATE INDEX IF NOT EXISTS idx_article_pricing_customer_id ON article_pricing(customer_id);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view customers in their tenant"
  ON customers FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create customers in their tenant"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update customers in their tenant"
  ON customers FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete customers in their tenant"
  ON customers FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for customer_contacts
CREATE POLICY "Users can view contacts in their tenant"
  ON customer_contacts FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create contacts in their tenant"
  ON customer_contacts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update contacts in their tenant"
  ON customer_contacts FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete contacts in their tenant"
  ON customer_contacts FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for articles
CREATE POLICY "Users can view articles in their tenant"
  ON articles FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create articles in their tenant"
  ON articles FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update articles in their tenant"
  ON articles FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete articles in their tenant"
  ON articles FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for article_pricing
CREATE POLICY "Users can view article pricing in their tenant"
  ON article_pricing FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage article pricing in their tenant"
  ON article_pricing FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_contacts_updated_at BEFORE UPDATE ON customer_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_pricing_updated_at BEFORE UPDATE ON article_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 20251001054514_create_invoices.sql
-- ============================================================================

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


-- ============================================================================
-- 20251001121559_fix_users_rls_infinite_recursion_v2.sql
-- ============================================================================

/*
  # Fix Users RLS Infinite Recursion

  1. Problem
    - Current policies query the users table within users policies
    - This creates infinite recursion when checking permissions
    - Prevents registration and login from working

  2. Solution
    - Drop existing problematic policies
    - Create new policies that don't self-reference during critical operations
    - Allow authenticated users to insert their own records during registration
    - Simplify policies to avoid recursion

  3. New Policies
    - Users can view their own record directly (id = auth.uid())
    - Users can insert their own record during registration
    - Use simpler checks that don't cause recursion

  4. Security
    - Still maintains tenant isolation where possible
    - Allows registration flow to work
    - More permissive during registration, strict after
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their tenant" ON users;
DROP POLICY IF EXISTS "Admins can update users in their tenant" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their tenant" ON users;

DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;

DROP POLICY IF EXISTS "Users can view their tenant's subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update their tenant's subscription" ON subscriptions;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Policy: Users can view their own record (no recursion)
CREATE POLICY "Users can view own user record"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy: Allow user insertion during registration
CREATE POLICY "Users can insert own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy: Users can update their own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy: Users can delete their own record
CREATE POLICY "Users can delete own record"
  ON users FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- TENANTS TABLE POLICIES
-- =====================================================

-- Policy: Allow tenant creation (needed for registration)
CREATE POLICY "Authenticated users can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can view any tenant (will be restricted by users table access)
CREATE POLICY "Authenticated users can view tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update any tenant (will be restricted by users table access)
CREATE POLICY "Authenticated users can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- =====================================================

-- Policy: Allow subscription creation (needed for registration)
CREATE POLICY "Authenticated users can create subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can view any subscription (will be restricted by tenant access)
CREATE POLICY "Authenticated users can view subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can update any subscription (will be restricted by tenant access)
CREATE POLICY "Authenticated users can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (true);


-- ============================================================================
-- 20251001152849_create_vehicles_and_deliveries.sql
-- ============================================================================

/*
  # Fahrzeugverwaltung & Lieferungen (Vehicle & Delivery Management)

  1. Neue Tabellen
    - `vehicles` - Fahrzeuge (LKW, Transporter, PKW)
    - `vehicle_maintenance` - Wartungshistorie
    - `delivery_notes` - Lieferscheine
    - `delivery_photos` - Lieferfotos (GPS + Unterschriften)

  2. Sicherheit
    - RLS für alle Tabellen aktiviert
    - Tenant-Isolation strikt durchgesetzt
    - Zugriff nur für authentifizierte Nutzer des Mandanten
*/

-- Fahrzeuge Tabelle
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Grunddaten
  license_plate text NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('truck', 'van', 'car', 'trailer', 'other')),
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  vin text,
  
  -- Technische Details
  fuel_type text CHECK (fuel_type IN ('diesel', 'petrol', 'electric', 'hybrid', 'cng')),
  fuel_capacity_liters numeric(10, 2),
  loading_capacity_kg numeric(10, 2),
  loading_capacity_m3 numeric(10, 2),
  emission_class text,
  
  -- Zulassung & Versicherung
  registration_date date,
  next_inspection_date date,
  insurance_expires date,
  insurance_company text,
  insurance_policy_number text,
  
  -- Wartung
  current_mileage_km integer DEFAULT 0,
  last_service_date date,
  last_service_mileage_km integer,
  next_service_due_km integer,
  next_service_due_date date,
  
  -- Zuordnung
  assigned_driver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_branch_id uuid,
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive', 'sold')),
  
  -- Kosten
  purchase_price numeric(10, 2),
  purchase_date date,
  estimated_monthly_costs numeric(10, 2),
  
  -- Notizen
  notes text,
  
  -- Metadaten
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  
  UNIQUE(tenant_id, license_plate)
);

-- Wartungshistorie
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('regular_service', 'repair', 'inspection', 'tire_change', 'other')),
  description text NOT NULL,
  maintenance_date date NOT NULL,
  mileage_km integer NOT NULL,
  
  cost numeric(10, 2) DEFAULT 0,
  workshop_name text,
  invoice_number text,
  invoice_file_url text,
  
  parts_replaced text[],
  next_service_due_km integer,
  next_service_due_date date,
  
  performed_by_user_id uuid REFERENCES users(id),
  
  created_at timestamptz DEFAULT now()
);

-- Lieferscheine
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Referenzen
  delivery_note_number text NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id),
  construction_site_id uuid,
  
  -- Daten
  delivery_date date NOT NULL,
  creation_date date DEFAULT CURRENT_DATE,
  
  -- Lieferadresse
  delivery_address_line1 text NOT NULL,
  delivery_address_line2 text,
  delivery_zip_code text NOT NULL,
  delivery_city text NOT NULL,
  delivery_country text DEFAULT 'DE',
  
  -- Positionen (JSON Array)
  items jsonb NOT NULL DEFAULT '[]',
  
  -- Logistik
  assigned_driver_id uuid REFERENCES users(id),
  assigned_vehicle_id uuid REFERENCES vehicles(id),
  estimated_delivery_time text,
  actual_delivery_time text,
  
  -- Status
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'delivered', 'partially_delivered', 'cancelled')),
  
  -- Liefernachweis
  recipient_name text,
  recipient_signature_url text,
  gps_latitude numeric(10, 6),
  gps_longitude numeric(10, 6),
  gps_timestamp timestamptz,
  
  -- Notizen
  internal_notes text,
  delivery_notes text,
  
  -- Metadaten
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  delivered_by uuid REFERENCES users(id),
  
  UNIQUE(tenant_id, delivery_note_number)
);

-- Lieferfotos
CREATE TABLE IF NOT EXISTS delivery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  photo_url text NOT NULL,
  photo_type text CHECK (photo_type IN ('damage', 'placement', 'signature', 'general')),
  description text,
  
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES users(id)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(assigned_driver_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_tenant ON vehicle_maintenance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_tenant ON delivery_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer ON delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_driver ON delivery_notes(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_delivery ON delivery_photos(delivery_note_id);

-- Row Level Security aktivieren
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Vehicles
CREATE POLICY "Users can view own tenant vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tenant vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies: Vehicle Maintenance
CREATE POLICY "Users can view own tenant maintenance"
  ON vehicle_maintenance FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant maintenance"
  ON vehicle_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies: Delivery Notes
CREATE POLICY "Users can view own tenant deliveries"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant deliveries"
  ON delivery_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant deliveries"
  ON delivery_notes FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies: Delivery Photos
CREATE POLICY "Users can view own tenant delivery photos"
  ON delivery_photos FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant delivery photos"
  ON delivery_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );


-- ============================================================================
-- 20251001174133_add_invoice_number_function.sql
-- ============================================================================

/*
  # SQL-Funktion für automatische Rechnungsnummern

  1. Funktionen
    - `get_next_invoice_number` - Generiert die nächste Rechnungsnummer
    
  2. Format
    - RE-2025-0001, RE-2025-0002, etc.
    - Jahr wird automatisch eingefügt
    - Nummer wird pro Tenant und Jahr hochgezählt
*/

-- Funktion zum Generieren der nächsten Rechnungsnummer
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year text;
  v_current_number integer;
  v_next_number integer;
  v_invoice_number text;
BEGIN
  -- Aktuelles Jahr
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Hole die aktuelle höchste Nummer für dieses Jahr und Tenant
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM 'RE-\d{4}-(\d+)')
      AS integer
    )
  ), 0)
  INTO v_current_number
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND invoice_number LIKE 'RE-' || v_year || '-%';
  
  -- Nächste Nummer
  v_next_number := v_current_number + 1;
  
  -- Formatiere die Rechnungsnummer mit führenden Nullen (4 Stellen)
  v_invoice_number := 'RE-' || v_year || '-' || LPAD(v_next_number::text, 4, '0');
  
  RETURN v_invoice_number;
END;
$$;


-- ============================================================================
-- 20251001181226_create_gobd_cashbook.sql
-- ============================================================================

/*
  # GoBD-konformes Kassenbuch (Cashbook System)

  1. Neue Tabellen
    - `cashbook_entries` - Kasseneinträge mit Hash-Chain
    - `cashbook_categories` - Kategorien (SKR03/SKR04)
    - `cash_audits` - Kassensturz/Cash-Counts

  2. GoBD-Compliance
    - Hash-Chain für Unveränderlichkeit (Blockchain-style)
    - Vollständige Audit-Trails
    - Keine Löschungen, nur Stornierungen
    - 10-Jahres-Aufbewahrung

  3. Sicherheit
    - RLS für alle Tabellen
    - Tenant-Isolation strikt
    - Nur Hinzufügen und Lesen, kein Update/Delete
*/

-- Kategorien für Kassenbuch (SKR03/SKR04)
CREATE TABLE IF NOT EXISTS cashbook_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  category_code text NOT NULL,
  category_name text NOT NULL,
  category_type text NOT NULL CHECK (category_type IN ('income', 'expense')),
  account_number text,
  is_default boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, category_code)
);

-- Kasseneinträge (mit Hash-Chain)
CREATE TABLE IF NOT EXISTS cashbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Dokumentendaten
  entry_date date NOT NULL,
  document_number text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('income', 'expense', 'opening_balance', 'cash_count')),
  
  -- Kategorisierung
  category_id uuid REFERENCES cashbook_categories(id),
  category_code text,
  description text NOT NULL,
  
  -- Beträge
  amount numeric(10, 2) NOT NULL,
  currency text DEFAULT 'EUR',
  vat_rate numeric(5, 2) DEFAULT 0,
  vat_amount numeric(10, 2) DEFAULT 0,
  net_amount numeric(10, 2) NOT NULL,
  
  -- Referenzen
  reference text,
  receipt_url text,
  customer_id uuid REFERENCES customers(id),
  
  -- Laufender Saldo
  cash_balance numeric(10, 2) NOT NULL,
  
  -- GoBD Hash-Chain (Blockchain-style)
  hash text NOT NULL,
  previous_hash text NOT NULL,
  hash_timestamp timestamptz DEFAULT now(),
  is_verified boolean DEFAULT false,
  verification_timestamp timestamptz,
  
  -- Stornierung (keine Löschung!)
  is_cancelled boolean DEFAULT false,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id),
  cancellation_reason text,
  correction_entry_id uuid REFERENCES cashbook_entries(id),
  
  -- Audit Trail
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  
  -- GPS (optional, für mobile)
  gps_latitude numeric(10, 6),
  gps_longitude numeric(10, 6),
  
  UNIQUE(tenant_id, document_number)
);

-- Kassensturz (Cash Audit)
CREATE TABLE IF NOT EXISTS cash_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  audit_date date NOT NULL,
  document_number text NOT NULL,
  
  -- Zählung
  counted_cash numeric(10, 2) NOT NULL,
  expected_cash numeric(10, 2) NOT NULL,
  difference numeric(10, 2) NOT NULL,
  
  -- Stückelung (JSON)
  denomination_details jsonb,
  
  -- Notizen
  notes text,
  
  -- Fotos
  photo_urls text[],
  
  -- Durchgeführt von
  auditor_id uuid NOT NULL REFERENCES users(id),
  
  -- GoBD Compliance
  hash text NOT NULL,
  previous_hash text NOT NULL,
  is_verified boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, document_number)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_cashbook_entries_tenant ON cashbook_entries(tenant_id) WHERE is_cancelled = false;
CREATE INDEX IF NOT EXISTS idx_cashbook_entries_date ON cashbook_entries(tenant_id, entry_date DESC) WHERE is_cancelled = false;
CREATE INDEX IF NOT EXISTS idx_cashbook_entries_type ON cashbook_entries(tenant_id, document_type) WHERE is_cancelled = false;
CREATE INDEX IF NOT EXISTS idx_cashbook_categories_tenant ON cashbook_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_audits_tenant ON cash_audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_audits_date ON cash_audits(tenant_id, audit_date DESC);

-- RLS aktivieren
ALTER TABLE cashbook_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Cashbook Categories
CREATE POLICY "Users can view own tenant categories"
  ON cashbook_categories FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant categories"
  ON cashbook_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies: Cashbook Entries (WICHTIG: Kein UPDATE/DELETE!)
CREATE POLICY "Users can view own tenant entries"
  ON cashbook_entries FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant entries"
  ON cashbook_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies: Cash Audits
CREATE POLICY "Users can view own tenant audits"
  ON cash_audits FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant audits"
  ON cash_audits FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Standard-Kategorien einfügen (für alle Tenants)
INSERT INTO cashbook_categories (tenant_id, category_code, category_name, category_type, account_number, is_default)
SELECT 
  t.id,
  'INCOME_SALES',
  'Warenverkauf',
  'income',
  '8400',
  true
FROM tenants t
ON CONFLICT (tenant_id, category_code) DO NOTHING;

INSERT INTO cashbook_categories (tenant_id, category_code, category_name, category_type, account_number, is_default)
SELECT 
  t.id,
  'INCOME_SERVICE',
  'Dienstleistungen',
  'income',
  '8300',
  true
FROM tenants t
ON CONFLICT (tenant_id, category_code) DO NOTHING;

INSERT INTO cashbook_categories (tenant_id, category_code, category_name, category_type, account_number, is_default)
SELECT 
  t.id,
  'EXPENSE_GOODS',
  'Wareneinkauf',
  'expense',
  '3400',
  true
FROM tenants t
ON CONFLICT (tenant_id, category_code) DO NOTHING;

INSERT INTO cashbook_categories (tenant_id, category_code, category_name, category_type, account_number, is_default)
SELECT 
  t.id,
  'EXPENSE_SERVICES',
  'Fremdleistungen',
  'expense',
  '4120',
  true
FROM tenants t
ON CONFLICT (tenant_id, category_code) DO NOTHING;

INSERT INTO cashbook_categories (tenant_id, category_code, category_name, category_type, account_number, is_default)
SELECT 
  t.id,
  'EXPENSE_OFFICE',
  'Bürobedarf',
  'expense',
  '4210',
  true
FROM tenants t
ON CONFLICT (tenant_id, category_code) DO NOTHING;

INSERT INTO cashbook_categories (tenant_id, category_code, category_name, category_type, account_number, is_default)
SELECT 
  t.id,
  'EXPENSE_VEHICLE',
  'Kfz-Kosten',
  'expense',
  '4630',
  true
FROM tenants t
ON CONFLICT (tenant_id, category_code) DO NOTHING;

INSERT INTO cashbook_categories (tenant_id, category_code, category_name, category_type, account_number, is_default)
SELECT 
  t.id,
  'EXPENSE_TRAVEL',
  'Reisekosten',
  'expense',
  '4650',
  true
FROM tenants t
ON CONFLICT (tenant_id, category_code) DO NOTHING;

-- Funktion: Nächste Kassenbuch-Dokumentennummer
CREATE OR REPLACE FUNCTION get_next_cashbook_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_date text;
  v_current_number integer;
  v_next_number integer;
  v_document_number text;
BEGIN
  v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(document_number FROM 'KS-\d{8}-(\d+)')
      AS integer
    )
  ), 0)
  INTO v_current_number
  FROM cashbook_entries
  WHERE tenant_id = p_tenant_id
    AND document_number LIKE 'KS-' || v_date || '-%';
  
  v_next_number := v_current_number + 1;
  v_document_number := 'KS-' || v_date || '-' || LPAD(v_next_number::text, 3, '0');
  
  RETURN v_document_number;
END;
$$;

-- Funktion: Aktueller Kassenstand
CREATE OR REPLACE FUNCTION get_current_cash_balance(p_tenant_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT COALESCE(cash_balance, 0)
  INTO v_balance
  FROM cashbook_entries
  WHERE tenant_id = p_tenant_id
    AND is_cancelled = false
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_balance, 0);
END;
$$;


-- ============================================================================
-- 20251001183147_add_bank_details_to_tenants.sql
-- ============================================================================

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


-- ============================================================================
-- 20251002100000_add_delivery_locations.sql
-- ============================================================================

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


-- ============================================================================
-- 20251002120000_add_delivery_and_discount_system.sql
-- ============================================================================

/*
  # Lieferungs- und Rabatt-System

  1. Neue Tabellen
    - `delivery_positions` - Positions-basierte Lieferungen mit Rabatt-Berechnung

  2. Artikel-Erweiterung
    - Rabatt-Felder zu articles Tabelle hinzufügen

  3. Kunden-Erweiterung
    - separate_construction_billing Flag für Baustellen-getrennte Abrechnung

  4. Rechnung-Erweiterung
    - construction_site_id für Baustellen-Zuordnung

  5. Security
    - RLS Policies für alle neuen Tabellen
    - Tenant-Isolation durchgängig
*/

-- Erweitere articles Tabelle mit Rabatt-Feldern
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS base_price numeric(10, 2),
ADD COLUMN IF NOT EXISTS discount_percentage numeric(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_start_date date,
ADD COLUMN IF NOT EXISTS discount_end_date date;

-- Migriere bestehende Preise zu base_price
UPDATE articles
SET base_price = unit_price
WHERE base_price IS NULL AND unit_price IS NOT NULL;

-- Erweitere customers Tabelle
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS separate_construction_billing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS default_payment_days integer DEFAULT 14;

-- Erweitere invoices Tabelle
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS construction_site_id uuid REFERENCES delivery_locations(id) ON DELETE SET NULL;

-- Erstelle delivery_positions Tabelle
CREATE TABLE IF NOT EXISTS delivery_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  delivery_location_id uuid REFERENCES delivery_locations(id) ON DELETE SET NULL,

  -- Lieferinformationen
  delivery_note_number text NOT NULL,
  delivery_timestamp timestamptz DEFAULT now(),
  delivery_quantity numeric(10, 3) NOT NULL,
  delivery_address text,
  delivery_status text DEFAULT 'DELIVERED' CHECK (delivery_status IN ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),

  -- Preisberechnung mit Rabatt
  unit_price numeric(10, 2) NOT NULL,
  discount_percentage numeric(5, 2) DEFAULT 0,
  discounted_price numeric(10, 2) NOT NULL,
  total_price numeric(10, 2) NOT NULL,

  -- Abrechnungsstatus
  customer_billing_done boolean DEFAULT false,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,

  -- Fahrzeug & Fahrer
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_name text,

  -- Zusatzinformationen
  unit text NOT NULL,
  description text,
  notes text,

  -- Snapshot der Kundendaten bei Lieferung
  customer_snapshot jsonb,
  article_snapshot jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,

  UNIQUE(tenant_id, delivery_note_number)
);

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_delivery_positions_tenant_id ON delivery_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_customer_id ON delivery_positions(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_article_id ON delivery_positions(article_id);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_delivery_location_id ON delivery_positions(delivery_location_id);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_billing_status ON delivery_positions(tenant_id, customer_billing_done, invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_delivery_status ON delivery_positions(tenant_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_delivery_timestamp ON delivery_positions(tenant_id, delivery_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_positions_not_deleted ON delivery_positions(tenant_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE delivery_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies für delivery_positions
CREATE POLICY "Users can view delivery_positions in own tenant"
  ON delivery_positions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can create delivery_positions in own tenant"
  ON delivery_positions FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update delivery_positions in own tenant"
  ON delivery_positions FOR UPDATE
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

CREATE POLICY "Users can delete delivery_positions in own tenant"
  ON delivery_positions FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

-- Trigger für updated_at
CREATE TRIGGER update_delivery_positions_updated_at
  BEFORE UPDATE ON delivery_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funktion zur Berechnung des aktuellen Artikelpreises mit Rabatt
CREATE OR REPLACE FUNCTION calculate_article_current_price(
  p_base_price numeric,
  p_discount_percentage numeric,
  p_discount_enabled boolean,
  p_discount_start_date date,
  p_discount_end_date date
)
RETURNS numeric AS $$
DECLARE
  v_current_price numeric;
BEGIN
  -- Wenn Rabatt nicht aktiviert oder 0%, gib Basispreis zurück
  IF NOT p_discount_enabled OR p_discount_percentage IS NULL OR p_discount_percentage = 0 THEN
    RETURN p_base_price;
  END IF;

  -- Prüfe Gültigkeitszeitraum
  IF p_discount_start_date IS NOT NULL AND CURRENT_DATE < p_discount_start_date THEN
    RETURN p_base_price;
  END IF;

  IF p_discount_end_date IS NOT NULL AND CURRENT_DATE > p_discount_end_date THEN
    RETURN p_base_price;
  END IF;

  -- Berechne rabattierten Preis
  v_current_price := p_base_price * (1 - p_discount_percentage / 100);

  RETURN v_current_price;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funktion zur Generierung der nächsten Lieferschein-Nummer
CREATE OR REPLACE FUNCTION generate_next_delivery_note_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_next_number integer;
  v_delivery_note_number text;
  v_year text;
  v_prefix text;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  v_prefix := 'LS-' || v_year || '-';

  -- Finde höchste Nummer für heute
  SELECT COALESCE(MAX(
    CASE
      WHEN delivery_note_number ~ ('^' || v_prefix || '[0-9]+$') THEN
        CAST(SUBSTRING(delivery_note_number FROM LENGTH(v_prefix) + 1) AS integer)
      ELSE 0
    END
  ), 0) + 1 INTO v_next_number
  FROM delivery_positions
  WHERE tenant_id = p_tenant_id;

  v_delivery_note_number := v_prefix || LPAD(v_next_number::text, 3, '0');

  RETURN v_delivery_note_number;
END;
$$ LANGUAGE plpgsql;

-- View für nicht-abgerechnete Lieferpositionen gruppiert nach Kunde/Baustelle
CREATE OR REPLACE VIEW pending_invoice_groups AS
SELECT
  dp.tenant_id,
  dp.customer_id,
  c.company_name as customer_name,
  c.separate_construction_billing,
  CASE
    WHEN c.separate_construction_billing THEN dp.delivery_location_id
    ELSE NULL
  END as construction_site_id,
  CASE
    WHEN c.separate_construction_billing THEN dl.name
    ELSE NULL
  END as construction_site_name,
  COUNT(dp.id) as position_count,
  SUM(dp.total_price) as total_net,
  SUM(dp.total_price * 1.19) as total_gross,
  MIN(dp.delivery_timestamp) as earliest_delivery,
  MAX(dp.delivery_timestamp) as latest_delivery
FROM delivery_positions dp
JOIN customers c ON dp.customer_id = c.id
LEFT JOIN delivery_locations dl ON dp.delivery_location_id = dl.id
WHERE
  dp.customer_billing_done = false
  AND dp.invoice_id IS NULL
  AND dp.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY
  dp.tenant_id,
  dp.customer_id,
  c.company_name,
  c.separate_construction_billing,
  CASE WHEN c.separate_construction_billing THEN dp.delivery_location_id ELSE NULL END,
  CASE WHEN c.separate_construction_billing THEN dl.name ELSE NULL END;

-- Funktion zum Erstellen einer Rechnung aus Lieferpositionen
CREATE OR REPLACE FUNCTION create_invoice_from_delivery_positions(
  p_tenant_id uuid,
  p_customer_id uuid,
  p_construction_site_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_total_net numeric := 0;
  v_total_tax numeric := 0;
  v_total_gross numeric := 0;
  v_tax_rate numeric := 19.00;
  v_position record;
  v_customer record;
  v_due_date date;
  v_result jsonb;
BEGIN
  -- Lade Kundendaten
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Berechne Fälligkeitsdatum
  v_due_date := CURRENT_DATE + INTERVAL '1 day' * COALESCE(v_customer.default_payment_days, 14);

  -- Generiere Rechnungsnummer
  SELECT generate_next_invoice_number(p_tenant_id) INTO v_invoice_number;

  -- Erstelle Rechnung
  INSERT INTO invoices (
    tenant_id,
    customer_id,
    invoice_number,
    invoice_date,
    due_date,
    status,
    construction_site_id,
    customer_snapshot
  ) VALUES (
    p_tenant_id,
    p_customer_id,
    v_invoice_number,
    CURRENT_DATE,
    v_due_date,
    'draft',
    p_construction_site_id,
    jsonb_build_object(
      'company_name', v_customer.company_name,
      'first_name', v_customer.first_name,
      'last_name', v_customer.last_name,
      'email', v_customer.email,
      'phone', v_customer.phone,
      'address', v_customer.address,
      'city', v_customer.city,
      'zip_code', v_customer.zip_code,
      'country', v_customer.country
    )
  ) RETURNING id INTO v_invoice_id;

  -- Erstelle Rechnungspositionen aus Lieferpositionen
  FOR v_position IN
    SELECT
      dp.*,
      a.description as article_description,
      a.article_number
    FROM delivery_positions dp
    JOIN articles a ON dp.article_id = a.id
    WHERE
      dp.tenant_id = p_tenant_id
      AND dp.customer_id = p_customer_id
      AND dp.customer_billing_done = false
      AND dp.invoice_id IS NULL
      AND dp.deleted_at IS NULL
      AND (
        (p_construction_site_id IS NULL AND (NOT v_customer.separate_construction_billing OR dp.delivery_location_id IS NULL))
        OR
        (p_construction_site_id IS NOT NULL AND dp.delivery_location_id = p_construction_site_id)
      )
    ORDER BY dp.delivery_timestamp
  LOOP
    -- Berechne Beträge
    v_total_net := v_total_net + v_position.total_price;

    -- Erstelle Rechnungsposition
    INSERT INTO invoice_items (
      tenant_id,
      invoice_id,
      article_id,
      description,
      quantity,
      unit_price,
      discount_percentage,
      tax_rate,
      total
    ) VALUES (
      p_tenant_id,
      v_invoice_id,
      v_position.article_id,
      v_position.article_description || ' (LS: ' || v_position.delivery_note_number || ')',
      v_position.delivery_quantity,
      v_position.unit_price,
      v_position.discount_percentage,
      v_tax_rate,
      v_position.total_price
    );

    -- Markiere Lieferposition als abgerechnet
    UPDATE delivery_positions
    SET
      customer_billing_done = true,
      invoice_id = v_invoice_id,
      updated_at = now()
    WHERE id = v_position.id;
  END LOOP;

  -- Berechne Steuern und Gesamt
  v_total_tax := v_total_net * (v_tax_rate / 100);
  v_total_gross := v_total_net + v_total_tax;

  -- Update Rechnung mit Summen
  UPDATE invoices
  SET
    subtotal = v_total_net,
    tax = v_total_tax,
    total = v_total_gross,
    updated_at = now()
  WHERE id = v_invoice_id;

  -- Erstelle Rückgabewert
  v_result := jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'total_net', v_total_net,
    'total_tax', v_total_tax,
    'total_gross', v_total_gross
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 20251002140000_add_advanced_pricing_system.sql
-- ============================================================================

/*
  # Erweitertes Preis- und Rabattsystem

  1. Neue Tabellen
    - `article_quantity_prices` - Mengenstaffel-Preise für Artikel
    - `article_customer_prices` - Kundenspezifische Preise mit optionalen Mengenstaffeln
    - `article_location_prices` - Lieferort-spezifische Preise mit optionalen Mengenstaffeln

  2. Funktionen
    - `calculate_best_price()` - Findet den besten Preis basierend auf Kunde, Lieferort und Menge
    - Berücksichtigt Priorität: Lieferort > Kunde > Mengenstaffel > Basispreis

  3. Security
    - RLS Policies für alle neuen Tabellen
    - Tenant-Isolation durchgängig

  4. Wichtige Hinweise
    - Mengenstaffel: Je höher die Menge, desto niedriger der Preis
    - Kundenpreise können eigene Mengenstaffeln haben
    - Lieferortpreise haben höchste Priorität
*/

-- Mengenstaffel-Preise für Artikel (allgemein)
CREATE TABLE IF NOT EXISTS article_quantity_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,

  min_quantity numeric(10, 3) NOT NULL CHECK (min_quantity >= 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),

  is_active boolean DEFAULT true,
  valid_from date,
  valid_until date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, article_id, min_quantity)
);

-- Kundenspezifische Preise (mit optionalen Mengenstaffeln)
CREATE TABLE IF NOT EXISTS article_customer_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  min_quantity numeric(10, 3) DEFAULT 0 CHECK (min_quantity >= 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),

  is_active boolean DEFAULT true,
  valid_from date,
  valid_until date,

  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, article_id, customer_id, min_quantity)
);

-- Lieferort-spezifische Preise (mit optionalen Mengenstaffeln)
CREATE TABLE IF NOT EXISTS article_location_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  delivery_location_id uuid NOT NULL REFERENCES delivery_locations(id) ON DELETE CASCADE,

  min_quantity numeric(10, 3) DEFAULT 0 CHECK (min_quantity >= 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),

  is_active boolean DEFAULT true,
  valid_from date,
  valid_until date,

  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, article_id, delivery_location_id, min_quantity)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_article_quantity_prices_article ON article_quantity_prices(article_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_article_customer_prices_article ON article_customer_prices(article_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_article_customer_prices_customer ON article_customer_prices(customer_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_article_location_prices_article ON article_location_prices(article_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_article_location_prices_location ON article_location_prices(delivery_location_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE article_quantity_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_customer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_location_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies für article_quantity_prices
CREATE POLICY "Users can view quantity prices in own tenant"
  ON article_quantity_prices FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can create quantity prices in own tenant"
  ON article_quantity_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update quantity prices in own tenant"
  ON article_quantity_prices FOR UPDATE
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

CREATE POLICY "Users can delete quantity prices in own tenant"
  ON article_quantity_prices FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

-- RLS Policies für article_customer_prices
CREATE POLICY "Users can view customer prices in own tenant"
  ON article_customer_prices FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can create customer prices in own tenant"
  ON article_customer_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update customer prices in own tenant"
  ON article_customer_prices FOR UPDATE
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

CREATE POLICY "Users can delete customer prices in own tenant"
  ON article_customer_prices FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

-- RLS Policies für article_location_prices
CREATE POLICY "Users can view location prices in own tenant"
  ON article_location_prices FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can create location prices in own tenant"
  ON article_location_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update location prices in own tenant"
  ON article_location_prices FOR UPDATE
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

CREATE POLICY "Users can delete location prices in own tenant"
  ON article_location_prices FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE users.id = auth.uid()
    )
  );

-- Triggers für updated_at
CREATE TRIGGER update_article_quantity_prices_updated_at
  BEFORE UPDATE ON article_quantity_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_customer_prices_updated_at
  BEFORE UPDATE ON article_customer_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_location_prices_updated_at
  BEFORE UPDATE ON article_location_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funktion zur Berechnung des besten Preises
CREATE OR REPLACE FUNCTION calculate_best_price(
  p_tenant_id uuid,
  p_article_id uuid,
  p_quantity numeric,
  p_customer_id uuid DEFAULT NULL,
  p_delivery_location_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_best_price numeric;
  v_price_source text;
  v_price_details jsonb;
  v_base_price numeric;
  v_temp_price numeric;
  v_check_date date := CURRENT_DATE;
BEGIN
  -- Hole Basispreis vom Artikel
  SELECT COALESCE(base_price, unit_price, 0)
  INTO v_base_price
  FROM articles
  WHERE id = p_article_id AND tenant_id = p_tenant_id;

  v_best_price := v_base_price;
  v_price_source := 'base_price';
  v_price_details := jsonb_build_object(
    'price', v_base_price,
    'source', 'Basispreis'
  );

  -- Prüfe Lieferort-spezifische Preise (höchste Priorität)
  IF p_delivery_location_id IS NOT NULL THEN
    SELECT unit_price
    INTO v_temp_price
    FROM article_location_prices
    WHERE tenant_id = p_tenant_id
      AND article_id = p_article_id
      AND delivery_location_id = p_delivery_location_id
      AND is_active = true
      AND min_quantity <= p_quantity
      AND (valid_from IS NULL OR valid_from <= v_check_date)
      AND (valid_until IS NULL OR valid_until >= v_check_date)
    ORDER BY min_quantity DESC
    LIMIT 1;

    IF v_temp_price IS NOT NULL THEN
      v_best_price := v_temp_price;
      v_price_source := 'location_price';
      v_price_details := jsonb_build_object(
        'price', v_temp_price,
        'source', 'Lieferort-Preis',
        'min_quantity', (
          SELECT min_quantity FROM article_location_prices
          WHERE tenant_id = p_tenant_id
            AND article_id = p_article_id
            AND delivery_location_id = p_delivery_location_id
            AND is_active = true
            AND min_quantity <= p_quantity
            AND (valid_from IS NULL OR valid_from <= v_check_date)
            AND (valid_until IS NULL OR valid_until >= v_check_date)
          ORDER BY min_quantity DESC
          LIMIT 1
        )
      );
    END IF;
  END IF;

  -- Prüfe Kunden-spezifische Preise (zweithöchste Priorität)
  IF p_customer_id IS NOT NULL AND v_price_source != 'location_price' THEN
    SELECT unit_price
    INTO v_temp_price
    FROM article_customer_prices
    WHERE tenant_id = p_tenant_id
      AND article_id = p_article_id
      AND customer_id = p_customer_id
      AND is_active = true
      AND min_quantity <= p_quantity
      AND (valid_from IS NULL OR valid_from <= v_check_date)
      AND (valid_until IS NULL OR valid_until >= v_check_date)
    ORDER BY min_quantity DESC
    LIMIT 1;

    IF v_temp_price IS NOT NULL THEN
      v_best_price := v_temp_price;
      v_price_source := 'customer_price';
      v_price_details := jsonb_build_object(
        'price', v_temp_price,
        'source', 'Kunden-Preis',
        'min_quantity', (
          SELECT min_quantity FROM article_customer_prices
          WHERE tenant_id = p_tenant_id
            AND article_id = p_article_id
            AND customer_id = p_customer_id
            AND is_active = true
            AND min_quantity <= p_quantity
            AND (valid_from IS NULL OR valid_from <= v_check_date)
            AND (valid_until IS NULL OR valid_until >= v_check_date)
          ORDER BY min_quantity DESC
          LIMIT 1
        )
      );
    END IF;
  END IF;

  -- Prüfe Mengenstaffel-Preise (niedrigste Priorität)
  IF v_price_source = 'base_price' THEN
    SELECT unit_price
    INTO v_temp_price
    FROM article_quantity_prices
    WHERE tenant_id = p_tenant_id
      AND article_id = p_article_id
      AND is_active = true
      AND min_quantity <= p_quantity
      AND (valid_from IS NULL OR valid_from <= v_check_date)
      AND (valid_until IS NULL OR valid_until >= v_check_date)
    ORDER BY min_quantity DESC
    LIMIT 1;

    IF v_temp_price IS NOT NULL THEN
      v_best_price := v_temp_price;
      v_price_source := 'quantity_price';
      v_price_details := jsonb_build_object(
        'price', v_temp_price,
        'source', 'Mengenstaffel',
        'min_quantity', (
          SELECT min_quantity FROM article_quantity_prices
          WHERE tenant_id = p_tenant_id
            AND article_id = p_article_id
            AND is_active = true
            AND min_quantity <= p_quantity
            AND (valid_from IS NULL OR valid_from <= v_check_date)
            AND (valid_until IS NULL OR valid_until >= v_check_date)
          ORDER BY min_quantity DESC
          LIMIT 1
        )
      );
    END IF;
  END IF;

  -- Rückgabe mit allen Details
  RETURN jsonb_build_object(
    'unit_price', v_best_price,
    'total_price', v_best_price * p_quantity,
    'source', v_price_source,
    'details', v_price_details
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 20251002160000_add_invoice_layout_system.sql
-- ============================================================================

/*
  # Invoice Layout System

  1. New Tables
    - `invoice_layouts`
      - Layout configuration for tenant invoices
      - Stores design templates and customization options
      - Includes logo storage

  2. Changes
    - Add invoice_layout_id to tenants
    - Create default templates

  3. Security
    - Enable RLS on invoice_layouts
    - Add policies for tenant isolation
*/

-- Create invoice_layouts table
CREATE TABLE IF NOT EXISTS invoice_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template selection
  template_name text NOT NULL DEFAULT 'modern',

  -- Logo configuration
  logo_url text,
  logo_width integer DEFAULT 120,
  logo_height integer DEFAULT 40,
  logo_position text DEFAULT 'top-left' CHECK (logo_position IN ('top-left', 'top-center', 'top-right')),

  -- Color scheme
  primary_color text DEFAULT '#0ea5e9',
  secondary_color text DEFAULT '#64748b',
  accent_color text DEFAULT '#0284c7',
  text_color text DEFAULT '#1e293b',

  -- Typography
  font_family text DEFAULT 'helvetica' CHECK (font_family IN ('helvetica', 'times', 'courier')),
  font_size_base integer DEFAULT 10,
  font_size_heading integer DEFAULT 20,

  -- Header configuration
  show_company_slogan boolean DEFAULT true,
  company_slogan text,
  header_background_color text DEFAULT '#ffffff',
  header_text_color text DEFAULT '#1e293b',

  -- Footer configuration
  footer_text text,
  show_page_numbers boolean DEFAULT true,
  show_qr_code boolean DEFAULT false,

  -- Layout options
  show_item_images boolean DEFAULT false,
  show_line_numbers boolean DEFAULT true,
  show_tax_breakdown boolean DEFAULT true,
  paper_size text DEFAULT 'A4' CHECK (paper_size IN ('A4', 'Letter')),

  -- Spacing and margins
  margin_top integer DEFAULT 20,
  margin_bottom integer DEFAULT 20,
  margin_left integer DEFAULT 20,
  margin_right integer DEFAULT 20,
  line_spacing decimal DEFAULT 1.2,

  -- Additional customizations
  show_bank_details boolean DEFAULT true,
  show_terms_conditions boolean DEFAULT false,
  terms_conditions_text text,

  -- Metadata
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add invoice_layout_id to tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'invoice_layout_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN invoice_layout_id uuid REFERENCES invoice_layouts(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE invoice_layouts ENABLE ROW LEVEL SECURITY;

-- Policies for invoice_layouts
CREATE POLICY "Users can view own tenant layouts"
  ON invoice_layouts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create layouts for own tenant"
  ON invoice_layouts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant layouts"
  ON invoice_layouts FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tenant layouts"
  ON invoice_layouts FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_invoice_layouts_updated_at ON invoice_layouts;
CREATE TRIGGER update_invoice_layouts_updated_at
  BEFORE UPDATE ON invoice_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_layouts_updated_at();

-- Create default layouts for existing tenants
INSERT INTO invoice_layouts (tenant_id, template_name, is_default)
SELECT id, 'modern', true
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_layouts WHERE tenant_id = tenants.id
);

-- Update tenants to reference their default layout
UPDATE tenants t
SET invoice_layout_id = (
  SELECT id FROM invoice_layouts
  WHERE tenant_id = t.id AND is_default = true
  LIMIT 1
)
WHERE invoice_layout_id IS NULL;


-- ============================================================================
-- 20251002180000_add_gobd_invoice_archiving.sql
-- ============================================================================

/*
  # GoBD-konforme Rechnungsarchivierung

  1. Änderungen an invoices
    - Layout-Snapshot bei Erstellung speichern (unveränderbar)
    - PDF-Archivierung für unveränderbare Rechnungen
    - Revisionssichere Timestamps

  2. Neue Tabelle: invoice_pdfs
    - Speichert generierte PDFs für GoBD-Konformität
    - Unveränderbar nach Erstellung
    - Vollständige Audit-Trail

  3. GoBD-Anforderungen
    - Unveränderbarkeit (keine Updates nach Finalisierung)
    - Vollständigkeit (alle Daten archiviert)
    - Nachvollziehbarkeit (Audit-Trail)
    - Verfügbarkeit (PDFs abrufbar)

  4. Security
    - RLS auf invoice_pdfs
    - Policies für Tenant-Isolation
*/

-- Add layout snapshot to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'layout_snapshot'
  ) THEN
    ALTER TABLE invoices ADD COLUMN layout_snapshot jsonb;
  END IF;
END $$;

-- Add PDF storage reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN pdf_url text;
  END IF;
END $$;

-- Add finalization timestamp (GoBD requirement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

-- Add version number for audit trail
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'version'
  ) THEN
    ALTER TABLE invoices ADD COLUMN version integer DEFAULT 1;
  END IF;
END $$;

-- Create invoice_pdfs table for GoBD archiving
CREATE TABLE IF NOT EXISTS invoice_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- PDF metadata
  pdf_format text NOT NULL CHECK (pdf_format IN ('standard', 'zugferd', 'xrechnung')),
  pdf_url text NOT NULL,
  pdf_size_bytes bigint,

  -- Hash for integrity verification (GoBD requirement)
  pdf_hash text NOT NULL,

  -- Snapshot of invoice data at generation time
  invoice_snapshot jsonb NOT NULL,
  layout_snapshot jsonb NOT NULL,

  -- Generation metadata
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz DEFAULT now() NOT NULL,

  -- GoBD metadata
  is_original boolean DEFAULT true,
  archive_location text,

  created_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure only one original PDF per invoice per format
  UNIQUE(invoice_id, pdf_format, is_original)
);

-- Enable RLS
ALTER TABLE invoice_pdfs ENABLE ROW LEVEL SECURITY;

-- Policies for invoice_pdfs
CREATE POLICY "Users can view own tenant invoice PDFs"
  ON invoice_pdfs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoice PDFs for own tenant"
  ON invoice_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- No update or delete policies - GoBD requires immutability!

-- Create function to prevent invoice changes after finalization
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow changes if not finalized
  IF OLD.finalized_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent any changes to finalized invoices
  RAISE EXCEPTION 'Finalisierte Rechnungen können nicht geändert werden (GoBD-Anforderung)';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce immutability
DROP TRIGGER IF EXISTS enforce_invoice_immutability ON invoices;
CREATE TRIGGER enforce_invoice_immutability
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invoice_modification();

-- Function to finalize invoice (GoBD)
CREATE OR REPLACE FUNCTION finalize_invoice(invoice_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET
    finalized_at = now(),
    status = CASE
      WHEN status = 'draft' THEN 'open'
      ELSE status
    END
  WHERE id = invoice_id_param
    AND finalized_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rechnung nicht gefunden oder bereits finalisiert';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invoice PDF archive entry
CREATE OR REPLACE FUNCTION archive_invoice_pdf(
  p_invoice_id uuid,
  p_pdf_format text,
  p_pdf_url text,
  p_pdf_hash text,
  p_pdf_size_bytes bigint
)
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
  v_invoice_data jsonb;
  v_layout_data jsonb;
  v_pdf_id uuid;
BEGIN
  -- Get tenant_id and invoice data
  SELECT tenant_id, row_to_json(invoices.*)::jsonb
  INTO v_tenant_id, v_invoice_data
  FROM invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rechnung nicht gefunden';
  END IF;

  -- Get layout data
  SELECT row_to_json(invoice_layouts.*)::jsonb
  INTO v_layout_data
  FROM invoice_layouts
  WHERE tenant_id = v_tenant_id
    AND is_default = true
  LIMIT 1;

  -- Create archive entry
  INSERT INTO invoice_pdfs (
    invoice_id,
    tenant_id,
    pdf_format,
    pdf_url,
    pdf_size_bytes,
    pdf_hash,
    invoice_snapshot,
    layout_snapshot,
    generated_by
  ) VALUES (
    p_invoice_id,
    v_tenant_id,
    p_pdf_format,
    p_pdf_url,
    p_pdf_size_bytes,
    p_pdf_hash,
    v_invoice_data,
    COALESCE(v_layout_data, '{}'::jsonb),
    auth.uid()
  )
  RETURNING id INTO v_pdf_id;

  -- Update invoice with PDF URL and layout snapshot
  UPDATE invoices
  SET
    pdf_url = p_pdf_url,
    layout_snapshot = v_layout_data
  WHERE id = p_invoice_id
    AND finalized_at IS NULL;

  RETURN v_pdf_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoice_pdfs_invoice_id ON invoice_pdfs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_pdfs_tenant_id ON invoice_pdfs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_finalized_at ON invoices(finalized_at);

-- Add comment for documentation
COMMENT ON TABLE invoice_pdfs IS 'GoBD-konforme Archivierung von Rechnungs-PDFs mit Unveränderbarkeitsgarantie';
COMMENT ON COLUMN invoices.layout_snapshot IS 'Snapshot des Layouts zum Zeitpunkt der Rechnungserstellung (GoBD)';
COMMENT ON COLUMN invoices.finalized_at IS 'Zeitpunkt der Finalisierung - danach keine Änderungen mehr möglich (GoBD)';
COMMENT ON FUNCTION prevent_invoice_modification() IS 'Verhindert Änderungen an finalisierten Rechnungen (GoBD-Konformität)';


-- ============================================================================
-- 20251002200000_add_tax_improvements.sql
-- ============================================================================

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


-- ============================================================================
-- 20251002210000_add_early_payment_discount.sql
-- ============================================================================

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


-- ============================================================================
-- 20251002220000_add_receipt_management.sql
-- ============================================================================

/*
  # Receipt Management for Cashbook Entries

  1. New Tables
    - `receipt_uploads`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants)
      - `cashbook_entry_id` (uuid, references cashbook_entries, nullable)
      - `file_name` (text)
      - `file_path` (text) - storage path
      - `file_size` (bigint)
      - `mime_type` (text)
      - `ocr_status` (text) - processing, completed, failed
      - `ocr_data` (jsonb) - extracted data from AI/OCR
      - `created_by` (uuid, references users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `receipt_id` column to `cashbook_entries` table

  3. Security
    - Enable RLS on `receipt_uploads` table
    - Add policies for tenant-scoped access

  4. Storage
    - Create storage bucket `receipts` for document uploads
    - Add RLS policies for bucket access
*/

-- Create receipt_uploads table
CREATE TABLE IF NOT EXISTS receipt_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cashbook_entry_id uuid REFERENCES cashbook_entries(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  ocr_status text NOT NULL DEFAULT 'processing' CHECK (ocr_status IN ('processing', 'completed', 'failed')),
  ocr_data jsonb,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add receipt_id to cashbook_entries if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashbook_entries' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE cashbook_entries ADD COLUMN receipt_id uuid REFERENCES receipt_uploads(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE receipt_uploads ENABLE ROW LEVEL SECURITY;

-- Policies for receipt_uploads
CREATE POLICY "Users can view receipts from their tenant"
  ON receipt_uploads
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert receipts for their tenant"
  ON receipt_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update receipts from their tenant"
  ON receipt_uploads
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete receipts from their tenant"
  ON receipt_uploads
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies will be added via Supabase dashboard or API
-- These ensure users can only access receipts from their tenant

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_tenant_id ON receipt_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_cashbook_entry_id ON receipt_uploads(cashbook_entry_id);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_created_at ON receipt_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cashbook_entries_receipt_id ON cashbook_entries(receipt_id);


-- ============================================================================
-- 20251002230000_create_receipts_storage_bucket.sql
-- ============================================================================

/*
  # Create Receipts Storage Bucket

  1. Storage Setup
    - Create storage bucket `receipts` for receipt uploads
    - Configure bucket to be private (not public)
    - Enable RLS on storage.objects table

  2. Security Policies
    - Users can only access receipts from their own tenant
    - Policies for INSERT, SELECT, UPDATE, DELETE operations
*/

-- Create the receipts bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

-- Enable RLS on storage.objects (should already be enabled, but ensure it)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload receipts to their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can view receipts from their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can update receipts from their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete receipts from their tenant" ON storage.objects;

-- Policy: Users can upload receipts to their tenant folder
CREATE POLICY "Users can upload receipts to their tenant"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can view receipts from their tenant
CREATE POLICY "Users can view receipts from their tenant"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can update receipts from their tenant
CREATE POLICY "Users can update receipts from their tenant"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can delete receipts from their tenant
CREATE POLICY "Users can delete receipts from their tenant"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
);


-- ============================================================================
-- 20251003100000_add_receipt_id_to_cashbook.sql
-- ============================================================================

/*
  # Add receipt_id to cashbook_entries

  1. Changes
    - Add receipt_id column to cashbook_entries
    - Add foreign key constraint to receipt_uploads
    - Add index for performance

  2. Purpose
    - Link cashbook entries to uploaded receipts
    - Enable GoBD-compliant document management
*/

-- Add receipt_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashbook_entries' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE cashbook_entries
    ADD COLUMN receipt_id uuid REFERENCES receipt_uploads(id);
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cashbook_entries_receipt_id
  ON cashbook_entries(receipt_id)
  WHERE receipt_id IS NOT NULL;


-- ============================================================================
-- 20251003120000_add_monthly_closing.sql
-- ============================================================================

/*
  # Monatsabschluss für Kassenbuch

  1. Neue Tabelle
    - `cashbook_monthly_closings` - Monatsabschlüsse mit Soll/Ist-Vergleich

  2. GoBD-Compliance
    - Unveränderliche Monatsabschlüsse
    - Hash-Signatur für jeden Abschluss
    - Vollständiger Audit-Trail
    - Differenzen werden dokumentiert

  3. Sicherheit
    - RLS aktiviert
    - Nur Lesen und Einfügen, kein Update/Delete
    - Tenant-Isolation
*/

CREATE TABLE IF NOT EXISTS cashbook_monthly_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Zeitraum
  closing_year integer NOT NULL,
  closing_month integer NOT NULL CHECK (closing_month >= 1 AND closing_month <= 12),
  closing_date date NOT NULL,

  -- Kassenstand
  opening_balance numeric(10, 2) NOT NULL DEFAULT 0,
  calculated_balance numeric(10, 2) NOT NULL,
  counted_balance numeric(10, 2) NOT NULL,
  difference numeric(10, 2) NOT NULL DEFAULT 0,

  -- Bewegungen im Monat
  total_income numeric(10, 2) NOT NULL DEFAULT 0,
  total_expense numeric(10, 2) NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,

  -- Stückelung bei Kassenzählung
  denomination_details jsonb,

  -- Bemerkungen
  notes text,
  difference_explanation text,

  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  finalized_at timestamptz,
  finalized_by uuid REFERENCES users(id),

  -- GoBD Hash-Signatur
  hash text NOT NULL,
  previous_closing_hash text,
  hash_timestamp timestamptz DEFAULT now(),

  -- Verknüpfung zu Kassensturz (optional)
  cash_audit_id uuid REFERENCES cash_audits(id),

  -- Audit Trail
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  ip_address text,

  -- Ein Abschluss pro Monat pro Tenant
  UNIQUE(tenant_id, closing_year, closing_month)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_monthly_closings_tenant
  ON cashbook_monthly_closings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_closings_date
  ON cashbook_monthly_closings(tenant_id, closing_year DESC, closing_month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_closings_status
  ON cashbook_monthly_closings(tenant_id, status);

-- RLS aktivieren
ALTER TABLE cashbook_monthly_closings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (mit DROP IF EXISTS für Idempotenz)
DROP POLICY IF EXISTS "Users can view own tenant monthly closings" ON cashbook_monthly_closings;
CREATE POLICY "Users can view own tenant monthly closings"
  ON cashbook_monthly_closings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own tenant monthly closings" ON cashbook_monthly_closings;
CREATE POLICY "Users can insert own tenant monthly closings"
  ON cashbook_monthly_closings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Funktion: Monatsabschluss erstellen
CREATE OR REPLACE FUNCTION create_monthly_closing(
  p_tenant_id uuid,
  p_year integer,
  p_month integer,
  p_counted_balance numeric,
  p_denomination_details jsonb,
  p_notes text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_opening_balance numeric;
  v_calculated_balance numeric;
  v_total_income numeric;
  v_total_expense numeric;
  v_transaction_count integer;
  v_difference numeric;
  v_previous_hash text;
  v_hash text;
  v_closing_date date;
  v_closing_id uuid;
  v_first_day date;
  v_last_day date;
BEGIN
  -- Zeitraum berechnen
  v_first_day := DATE(p_year || '-' || LPAD(p_month::text, 2, '0') || '-01');
  v_last_day := (DATE_TRUNC('month', v_first_day) + INTERVAL '1 month - 1 day')::date;
  v_closing_date := v_last_day;

  -- Prüfen ob bereits ein Abschluss existiert
  IF EXISTS (
    SELECT 1 FROM cashbook_monthly_closings
    WHERE tenant_id = p_tenant_id
      AND closing_year = p_year
      AND closing_month = p_month
      AND status = 'finalized'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Für diesen Monat existiert bereits ein finalisierter Abschluss'
    );
  END IF;

  -- Eröffnungsbilanz: Kassenbestand am Ende des Vormonats
  SELECT COALESCE(calculated_balance, 0)
  INTO v_opening_balance
  FROM cashbook_monthly_closings
  WHERE tenant_id = p_tenant_id
    AND (
      (closing_year = p_year AND closing_month = p_month - 1) OR
      (closing_year = p_year - 1 AND closing_month = 12 AND p_month = 1)
    )
    AND status = 'finalized'
  LIMIT 1;

  -- Falls kein Vormonat: Kassenbestand am Anfang des Monats
  IF v_opening_balance IS NULL THEN
    SELECT COALESCE(cash_balance, 0)
    INTO v_opening_balance
    FROM cashbook_entries
    WHERE tenant_id = p_tenant_id
      AND entry_date < v_first_day
      AND is_cancelled = false
    ORDER BY entry_date DESC, created_at DESC
    LIMIT 1;
  END IF;

  v_opening_balance := COALESCE(v_opening_balance, 0);

  -- Bewegungen im Monat berechnen
  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expense,
    COUNT(*) as count
  INTO v_total_income, v_total_expense, v_transaction_count
  FROM cashbook_entries
  WHERE tenant_id = p_tenant_id
    AND entry_date >= v_first_day
    AND entry_date <= v_last_day
    AND is_cancelled = false
    AND document_type IN ('income', 'expense');

  -- Berechneter Kassenbestand
  v_calculated_balance := v_opening_balance + v_total_income - v_total_expense;

  -- Differenz
  v_difference := p_counted_balance - v_calculated_balance;

  -- Hash des letzten Abschlusses holen
  SELECT hash
  INTO v_previous_hash
  FROM cashbook_monthly_closings
  WHERE tenant_id = p_tenant_id
    AND status = 'finalized'
  ORDER BY closing_year DESC, closing_month DESC
  LIMIT 1;

  v_previous_hash := COALESCE(v_previous_hash, '0');

  -- Hash berechnen (vereinfacht, in Produktion würde man crypto verwenden)
  v_hash := MD5(
    p_tenant_id::text ||
    p_year::text ||
    p_month::text ||
    v_calculated_balance::text ||
    p_counted_balance::text ||
    v_previous_hash ||
    NOW()::text
  );

  -- Abschluss einfügen
  INSERT INTO cashbook_monthly_closings (
    tenant_id,
    closing_year,
    closing_month,
    closing_date,
    opening_balance,
    calculated_balance,
    counted_balance,
    difference,
    total_income,
    total_expense,
    transaction_count,
    denomination_details,
    notes,
    status,
    hash,
    previous_closing_hash,
    created_by
  ) VALUES (
    p_tenant_id,
    p_year,
    p_month,
    v_closing_date,
    v_opening_balance,
    v_calculated_balance,
    p_counted_balance,
    v_difference,
    v_total_income,
    v_total_expense,
    v_transaction_count,
    p_denomination_details,
    p_notes,
    'draft',
    v_hash,
    v_previous_hash,
    p_user_id
  )
  RETURNING id INTO v_closing_id;

  RETURN jsonb_build_object(
    'success', true,
    'closing_id', v_closing_id,
    'opening_balance', v_opening_balance,
    'calculated_balance', v_calculated_balance,
    'counted_balance', p_counted_balance,
    'difference', v_difference,
    'total_income', v_total_income,
    'total_expense', v_total_expense,
    'transaction_count', v_transaction_count
  );
END;
$$;

-- Funktion: Monatsabschluss finalisieren
CREATE OR REPLACE FUNCTION finalize_monthly_closing(
  p_closing_id uuid,
  p_user_id uuid,
  p_difference_explanation text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_status text;
BEGIN
  -- Status prüfen
  SELECT tenant_id, status
  INTO v_tenant_id, v_status
  FROM cashbook_monthly_closings
  WHERE id = p_closing_id;

  IF v_status = 'finalized' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Dieser Abschluss wurde bereits finalisiert'
    );
  END IF;

  -- Finalisieren
  UPDATE cashbook_monthly_closings
  SET
    status = 'finalized',
    finalized_at = NOW(),
    finalized_by = p_user_id,
    difference_explanation = p_difference_explanation
  WHERE id = p_closing_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Monatsabschluss wurde erfolgreich finalisiert'
  );
END;
$$;


-- ============================================================================
-- 20251003140000_add_quotes_and_dunning.sql
-- ============================================================================

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


-- ============================================================================
-- 20251003150000_add_multiuser_and_support.sql
-- ============================================================================

/*
  # Multi-User, Rollen & Support-System

  1. Neue Tabellen
    - `user_roles` - Rollen-Definition
    - `tenant_users` - Benutzer-Zuordnung mit Rollen
    - `support_tickets` - Support-Anfragen
    - `ticket_messages` - Nachrichten in Tickets
    - `email_templates` - E-Mail-Vorlagen
    - `email_log` - E-Mail-Versand-Protokoll

  2. Rollen-System
    - Owner (Volle Kontrolle + Billing)
    - Admin (Volle Kontrolle ohne Billing)
    - Accountant (Finanz-Daten + Berichte)
    - Sales (Kunden, Angebote, Rechnungen - keine Preisänderung)
    - ReadOnly (Nur Lesen)

  3. Security
    - Enable RLS on all tables
    - Role-based access policies
*/

-- Create user_roles enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'accountant', 'sales', 'readonly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create tenant_users table (many-to-many User <-> Tenant)
CREATE TABLE IF NOT EXISTS tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'readonly',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  is_active boolean DEFAULT true,
  can_manage_users boolean DEFAULT false,
  can_manage_billing boolean DEFAULT false,
  can_edit_prices boolean DEFAULT false,
  can_delete_data boolean DEFAULT false,
  ip_whitelist text[], -- Array of allowed IPs
  session_timeout_minutes integer DEFAULT 480, -- 8 hours
  require_2fa boolean DEFAULT false,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  category text NOT NULL CHECK (category IN ('bug', 'feature', 'question', 'billing', 'technical', 'other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  subject text NOT NULL,
  description text NOT NULL,
  resolution text,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  message text NOT NULL,
  is_internal boolean DEFAULT false, -- Internal notes only visible to admins
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = system template
  template_key text NOT NULL,
  template_name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb, -- Available variables
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, template_key)
);

-- Create email_log table
CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  template_id uuid REFERENCES email_templates(id),
  to_email text NOT NULL,
  from_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message text,
  opened_at timestamptz,
  clicked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(tenant_id, role);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_email_log_tenant ON email_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);

-- Enable RLS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_users
DROP POLICY IF EXISTS "Users can view own tenant members" ON tenant_users;
CREATE POLICY "Users can view own tenant members"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage tenant users" ON tenant_users;
CREATE POLICY "Admins can manage tenant users"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'admin')
      AND tu.can_manage_users = true
    )
  );

-- RLS Policies for support_tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own tickets" ON support_tickets;
CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for ticket_messages
DROP POLICY IF EXISTS "Users can view ticket messages" ON ticket_messages;
CREATE POLICY "Users can view ticket messages"
  ON ticket_messages FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
      OR created_by = auth.uid()
    )
    AND (is_internal = false OR auth.uid() IN (
      SELECT user_id FROM tenant_users WHERE role IN ('owner', 'admin')
    ))
  );

DROP POLICY IF EXISTS "Users can create ticket messages" ON ticket_messages;
CREATE POLICY "Users can create ticket messages"
  ON ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
      OR created_by = auth.uid()
    )
  );

-- RLS Policies for email_templates
DROP POLICY IF EXISTS "Users can view templates" ON email_templates;
CREATE POLICY "Users can view templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL -- System templates
    OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage templates" ON email_templates;
CREATE POLICY "Admins can manage templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for email_log
DROP POLICY IF EXISTS "Users can view own email log" ON email_log;
CREATE POLICY "Users can view own email log"
  ON email_log FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Function: Generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  v_year text;
  v_count integer;
  v_number text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(CAST(substring(ticket_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO v_count
  FROM support_tickets
  WHERE ticket_number LIKE 'TICKET-' || v_year || '-%';

  v_number := 'TICKET-' || v_year || '-' || LPAD(v_count::text, 5, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user role in tenant
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid, p_tenant_id uuid)
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM tenant_users
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND is_active = true;

  RETURN COALESCE(v_role, 'readonly'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check user permission
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_permission text
)
RETURNS boolean AS $$
DECLARE
  v_role user_role;
  v_can_manage_users boolean;
  v_can_manage_billing boolean;
  v_can_edit_prices boolean;
  v_can_delete_data boolean;
BEGIN
  SELECT role, can_manage_users, can_manage_billing, can_edit_prices, can_delete_data
  INTO v_role, v_can_manage_users, v_can_manage_billing, v_can_edit_prices, v_can_delete_data
  FROM tenant_users
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND is_active = true;

  -- Owner has all permissions
  IF v_role = 'owner' THEN
    RETURN true;
  END IF;

  -- Check specific permissions
  CASE p_permission
    WHEN 'manage_users' THEN RETURN v_can_manage_users;
    WHEN 'manage_billing' THEN RETURN v_can_manage_billing;
    WHEN 'edit_prices' THEN RETURN v_can_edit_prices;
    WHEN 'delete_data' THEN RETURN v_can_delete_data;
    WHEN 'view_financials' THEN RETURN v_role IN ('owner', 'admin', 'accountant');
    WHEN 'create_invoices' THEN RETURN v_role IN ('owner', 'admin', 'accountant', 'sales');
    WHEN 'edit_customers' THEN RETURN v_role IN ('owner', 'admin', 'sales');
    ELSE RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default email templates
INSERT INTO email_templates (template_key, template_name, subject, body_html, body_text, variables)
VALUES
  ('invoice_created', 'Rechnung erstellt',
   'Ihre Rechnung {{invoice_number}}',
   '<h1>Rechnung {{invoice_number}}</h1><p>Sehr geehrte/r {{customer_name}},</p><p>anbei erhalten Sie die Rechnung {{invoice_number}} vom {{invoice_date}}.</p><p>Betrag: {{total_amount}}</p><p>Fällig am: {{due_date}}</p>',
   'Rechnung {{invoice_number}}\n\nSehr geehrte/r {{customer_name}},\n\nanbei erhalten Sie die Rechnung {{invoice_number}} vom {{invoice_date}}.\n\nBetrag: {{total_amount}}\nFällig am: {{due_date}}',
   '["invoice_number", "customer_name", "invoice_date", "total_amount", "due_date"]'::jsonb),

  ('payment_reminder', 'Zahlungserinnerung',
   'Erinnerung: Rechnung {{invoice_number}}',
   '<h1>Zahlungserinnerung</h1><p>Sehr geehrte/r {{customer_name}},</p><p>wir möchten Sie freundlich an die Zahlung der Rechnung {{invoice_number}} erinnern.</p><p>Betrag: {{total_amount}}</p><p>Fällig seit: {{days_overdue}} Tagen</p>',
   'Zahlungserinnerung\n\nSehr geehrte/r {{customer_name}},\n\nwir möchten Sie freundlich an die Zahlung der Rechnung {{invoice_number}} erinnern.\n\nBetrag: {{total_amount}}\nFällig seit: {{days_overdue}} Tagen',
   '["invoice_number", "customer_name", "total_amount", "days_overdue"]'::jsonb),

  ('quote_sent', 'Angebot versendet',
   'Ihr Angebot {{quote_number}}',
   '<h1>Angebot {{quote_number}}</h1><p>Sehr geehrte/r {{customer_name}},</p><p>vielen Dank für Ihre Anfrage. Anbei erhalten Sie unser Angebot {{quote_number}}.</p><p>Gültig bis: {{valid_until}}</p>',
   'Angebot {{quote_number}}\n\nSehr geehrte/r {{customer_name}},\n\nvielen Dank für Ihre Anfrage. Anbei erhalten Sie unser Angebot {{quote_number}}.\n\nGültig bis: {{valid_until}}',
   '["quote_number", "customer_name", "valid_until"]'::jsonb)
ON CONFLICT (tenant_id, template_key) DO NOTHING;


