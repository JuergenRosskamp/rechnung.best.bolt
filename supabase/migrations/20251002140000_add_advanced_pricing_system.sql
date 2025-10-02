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
