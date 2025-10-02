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
