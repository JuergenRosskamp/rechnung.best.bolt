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
