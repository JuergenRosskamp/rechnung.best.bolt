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
