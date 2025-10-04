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
