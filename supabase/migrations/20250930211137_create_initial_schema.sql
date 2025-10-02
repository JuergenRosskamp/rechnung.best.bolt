/*
  # Initial Schema - Tenant Isolation & Authentication
  
  1. New Tables
    - `tenants` - Multi-tenant isolation root table
      - `id` (uuid, primary key)
      - `company_name` (text, required)
      - `address_line1`, `address_line2`, `zip_code`, `city`, `country` (text, optional)
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
