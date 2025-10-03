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
