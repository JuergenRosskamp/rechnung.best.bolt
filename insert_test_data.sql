-- ============================================================================
-- UMFANGREICHE TESTDATEN FÜR rechnung.best
-- ============================================================================
-- User: juergen.rosskamp@gmail.com
-- Erstellt: 20 Kunden, 25 Artikel, 5 Fahrzeuge, 30 Rechnungen,
--           10 Angebote, 40 Kassenbucheinträge, 15 Lieferscheine
-- ============================================================================

DO $$
DECLARE
  -- IDs
  v_tenant_id UUID;
  v_user_id UUID;
  v_customer_ids UUID[] := '{}';
  v_article_ids UUID[] := '{}';
  v_vehicle_ids UUID[] := '{}';
  v_invoice_ids UUID[] := '{}';
  v_customer_id UUID;
  v_article_id UUID;
  v_vehicle_id UUID;
  v_invoice_id UUID;

  -- Zähler
  i INT;
  j INT;

  -- Temporäre Werte
  v_customer_number TEXT;
  v_article_number TEXT;
  v_invoice_total NUMERIC;
  v_invoice_vat NUMERIC;
  v_invoice_subtotal NUMERIC;

BEGIN
  -- ============================================================================
  -- 1. USER & TENANT LOOKUP
  -- ============================================================================
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TESTDATEN-ERSTELLUNG FÜR rechnung.best';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';

  SELECT u.tenant_id, u.id INTO v_tenant_id, v_user_id
  FROM users u
  WHERE u.email = 'juergen.rosskamp@gmail.com'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User juergen.rosskamp@gmail.com nicht gefunden!';
  END IF;

  RAISE NOTICE '✓ User gefunden: %', v_user_id;
  RAISE NOTICE '✓ Tenant ID: %', v_tenant_id;
  RAISE NOTICE '';

  -- ============================================================================
  -- 2. KUNDEN (20 Stück: 12 B2B, 6 B2C, 2 B2G)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 20 Kunden...';

  FOR i IN 1..20 LOOP
    v_customer_number := 'K-' || LPAD(i::TEXT, 5, '0');

    INSERT INTO customers (
      tenant_id,
      customer_number,
      customer_type,
      company_name,
      first_name,
      last_name,
      email,
      phone,
      address_line1,
      zip_code,
      city,
      country,
      default_payment_terms,
      discount_percentage
    )
    VALUES (
      v_tenant_id,
      v_customer_number,
      CASE
        WHEN i <= 12 THEN 'b2b'
        WHEN i <= 18 THEN 'b2c'
        ELSE 'b2g'
      END,
      CASE
        WHEN i <= 12 THEN 'Firma ' || i || ' GmbH'
        ELSE NULL
      END,
      CASE
        WHEN i > 12 THEN 'Max' || i
        ELSE NULL
      END,
      CASE
        WHEN i > 12 THEN 'Mustermann' || i
        ELSE NULL
      END,
      'kunde' || i || '@example.com',
      '+49 ' || (100 + i) || ' 123456' || i,
      'Teststraße ' || i,
      LPAD((10000 + i * 100)::TEXT, 5, '0'),
      CASE i % 5
        WHEN 0 THEN 'Berlin'
        WHEN 1 THEN 'Hamburg'
        WHEN 2 THEN 'München'
        WHEN 3 THEN 'Köln'
        ELSE 'Frankfurt'
      END,
      'Deutschland',
      CASE i % 3
        WHEN 0 THEN 'net_14'
        WHEN 1 THEN 'net_30'
        ELSE 'immediate'
      END,
      CASE i % 4
        WHEN 0 THEN 5.0
        WHEN 1 THEN 10.0
        ELSE 0
      END
    )
    RETURNING id INTO v_customer_id;

    v_customer_ids := array_append(v_customer_ids, v_customer_id);
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: % Kunden', array_length(v_customer_ids, 1);
  RAISE NOTICE '';

  -- ============================================================================
  -- 3. ARTIKEL (25 Stück: Produkte, Dienstleistungen, Services)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 25 Artikel...';

  FOR i IN 1..25 LOOP
    v_article_number := 'ART-' || LPAD(i::TEXT, 5, '0');

    INSERT INTO articles (
      tenant_id,
      article_number,
      name,
      category,
      unit,
      unit_price,
      vat_rate,
      cost_price,
      is_service,
      description
    )
    VALUES (
      v_tenant_id,
      v_article_number,
      CASE
        WHEN i <= 5 THEN 'Produkt Standard ' || i
        WHEN i <= 10 THEN 'Produkt Premium ' || (i - 5)
        WHEN i <= 15 THEN 'Dienstleistung ' || (i - 10)
        WHEN i <= 20 THEN 'Service Paket ' || (i - 15)
        ELSE 'Sonderartikel ' || (i - 20)
      END,
      CASE
        WHEN i <= 10 THEN 'Produkte'
        WHEN i <= 15 THEN 'Dienstleistungen'
        ELSE 'Services'
      END,
      CASE
        WHEN i <= 10 THEN 'Stück'
        WHEN i <= 15 THEN 'Stunde'
        WHEN i <= 20 THEN 'Paket'
        ELSE 'Set'
      END,
      CASE
        WHEN i <= 5 THEN 50 + i * 10
        WHEN i <= 10 THEN 150 + i * 20
        WHEN i <= 15 THEN 80 + i * 5
        WHEN i <= 20 THEN 200 + i * 15
        ELSE 500 + i * 50
      END,
      CASE
        WHEN i % 3 = 0 THEN 7
        ELSE 19
      END,
      CASE
        WHEN i <= 10 THEN 30 + i * 5
        ELSE NULL
      END,
      i > 10,
      'Testbeschreibung für Artikel ' || i || ' - Lorem ipsum dolor sit amet.'
    )
    RETURNING id INTO v_article_id;

    v_article_ids := array_append(v_article_ids, v_article_id);
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: % Artikel', array_length(v_article_ids, 1);
  RAISE NOTICE '';

  -- ============================================================================
  -- 4. FAHRZEUGE (5 Stück: Trucks, Vans, Car)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 5 Fahrzeuge...';

  FOR i IN 1..5 LOOP
    INSERT INTO vehicles (
      tenant_id,
      license_plate,
      vehicle_type,
      make,
      model,
      loading_capacity_kg,
      loading_capacity_m3,
      status,
      notes
    )
    VALUES (
      v_tenant_id,
      'B-TE ' || (1000 + i),
      CASE
        WHEN i <= 2 THEN 'truck'
        WHEN i <= 4 THEN 'van'
        ELSE 'car'
      END,
      CASE i
        WHEN 1 THEN 'Mercedes'
        WHEN 2 THEN 'MAN'
        WHEN 3 THEN 'VW'
        WHEN 4 THEN 'Ford'
        ELSE 'BMW'
      END,
      CASE i
        WHEN 1 THEN 'Sprinter'
        WHEN 2 THEN 'TGX'
        WHEN 3 THEN 'Crafter'
        WHEN 4 THEN 'Transit'
        ELSE '320d'
      END,
      CASE
        WHEN i <= 2 THEN 5000 + i * 2000
        ELSE 1000 + i * 500
      END,
      CASE
        WHEN i <= 2 THEN 15 + i * 5
        ELSE 3 + i
      END,
      CASE
        WHEN i % 2 = 0 THEN 'active'
        ELSE 'maintenance'
      END,
      'Testfahrzeug ' || i || ' - Regelmäßige Wartung durchgeführt'
    )
    RETURNING id INTO v_vehicle_id;

    v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle_id);
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: % Fahrzeuge', array_length(v_vehicle_ids, 1);
  RAISE NOTICE '';

  -- ============================================================================
  -- 5. RECHNUNGEN (30 Stück mit je 1-5 Positionen)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 30 Rechnungen mit Positionen...';

  FOR i IN 1..30 LOOP
    -- Zufälligen Kunden auswählen
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];

    -- Rechnung erstellen (Beträge werden durch Trigger berechnet)
    INSERT INTO invoices (
      tenant_id,
      customer_id,
      invoice_number,
      invoice_date,
      due_date,
      status,
      subtotal,
      vat_amount,
      total,
      notes,
      payment_terms,
      created_by
    )
    VALUES (
      v_tenant_id,
      v_customer_id,
      'RE-2024-' || LPAD(i::TEXT, 4, '0'),
      CURRENT_DATE - (i * 3),
      CURRENT_DATE - (i * 3) + INTERVAL '14 days',
      CASE i % 5
        WHEN 0 THEN 'draft'
        WHEN 1 THEN 'sent'
        WHEN 2 THEN 'paid'
        WHEN 3 THEN 'overdue'
        ELSE 'cancelled'
      END,
      0, -- wird durch Trigger berechnet
      0, -- wird durch Trigger berechnet
      0, -- wird durch Trigger berechnet
      'Testrechnung ' || i || ' - Vielen Dank für Ihren Auftrag',
      '14 Tage netto',
      v_user_id
    )
    RETURNING id INTO v_invoice_id;

    v_invoice_ids := array_append(v_invoice_ids, v_invoice_id);

    -- Rechnungspositionen (1-5 Stück)
    FOR j IN 1..(1 + (i % 5)) LOOP
      v_article_id := v_article_ids[1 + ((i + j) % array_length(v_article_ids, 1))];

      INSERT INTO invoice_items (
        invoice_id,
        article_id,
        description,
        quantity,
        unit_price,
        vat_rate,
        line_total,
        vat_amount
      )
      SELECT
        v_invoice_id,
        v_article_id,
        a.name || ' - Position ' || j,
        (1 + (j % 10))::numeric,
        a.unit_price,
        a.vat_rate,
        ROUND((1 + (j % 10)) * a.unit_price, 2),
        ROUND((1 + (j % 10)) * a.unit_price * a.vat_rate / 100, 2)
      FROM articles a
      WHERE a.id = v_article_id;
    END LOOP;

    -- Rechnungssummen aktualisieren
    UPDATE invoices
    SET
      subtotal = (
        SELECT COALESCE(SUM(line_total), 0)
        FROM invoice_items
        WHERE invoice_id = v_invoice_id
      ),
      vat_amount = (
        SELECT COALESCE(SUM(vat_amount), 0)
        FROM invoice_items
        WHERE invoice_id = v_invoice_id
      )
    WHERE id = v_invoice_id;

    UPDATE invoices
    SET total = subtotal + vat_amount
    WHERE id = v_invoice_id;
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: % Rechnungen mit Positionen', array_length(v_invoice_ids, 1);
  RAISE NOTICE '';

  -- ============================================================================
  -- 6. ANGEBOTE (10 Stück)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 10 Angebote...';

  FOR i IN 1..10 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];

    INSERT INTO quotes (
      tenant_id,
      customer_id,
      quote_number,
      quote_date,
      valid_until,
      status,
      subtotal,
      vat_amount,
      total,
      notes,
      created_by
    )
    VALUES (
      v_tenant_id,
      v_customer_id,
      'ANG-2024-' || LPAD(i::TEXT, 4, '0'),
      CURRENT_DATE - (i * 2),
      CURRENT_DATE - (i * 2) + INTERVAL '30 days',
      CASE i % 4
        WHEN 0 THEN 'draft'
        WHEN 1 THEN 'sent'
        WHEN 2 THEN 'accepted'
        ELSE 'declined'
      END,
      1000 + i * 500,
      (1000 + i * 500) * 0.19,
      (1000 + i * 500) * 1.19,
      'Testangebot ' || i || ' - Gerne erstellen wir Ihnen ein individuelles Angebot',
      v_user_id
    );
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 10 Angebote';
  RAISE NOTICE '';

  -- ============================================================================
  -- 7. KASSENBUCH-EINTRÄGE (40 Stück)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 40 Kassenbuch-Einträge...';

  -- Kassenbuch benötigt document_number (NOT NULL)
  FOR i IN 1..40 LOOP
    INSERT INTO cashbook_entries (
      tenant_id,
      entry_date,
      document_number,
      document_type,
      category_code,
      description,
      amount,
      vat_rate,
      vat_amount,
      net_amount,
      reference,
      cash_balance,
      hash,
      previous_hash
    )
    VALUES (
      v_tenant_id,
      CURRENT_DATE - (i * 2),
      'KB-' || LPAD(i::TEXT, 6, '0'),
      CASE
        WHEN i % 5 = 0 THEN 'income'
        ELSE 'expense'
      END,
      CASE i % 5
        WHEN 0 THEN '4000' -- Büromaterial
        WHEN 1 THEN '6805' -- Porto
        WHEN 2 THEN '6670' -- Fahrtkosten
        WHEN 3 THEN '6644' -- Bewirtung
        ELSE '6300' -- Sonstige
      END,
      'Kassenbuch Eintrag ' || i || ' - ' ||
      CASE
        WHEN i % 5 = 0 THEN 'Einnahme'
        ELSE 'Ausgabe'
      END,
      (10 + (i * 13) % 500)::numeric,
      CASE
        WHEN i % 3 = 0 THEN 7
        ELSE 19
      END,
      ROUND((10 + (i * 13) % 500) * CASE WHEN i % 3 = 0 THEN 0.07 ELSE 0.19 END, 2),
      ROUND((10 + (i * 13) % 500) / (1 + CASE WHEN i % 3 = 0 THEN 0.07 ELSE 0.19 END), 2),
      'REF-KB-' || LPAD(i::TEXT, 4, '0'),
      1000 + (i * 50), -- Vereinfachter Kassenstand
      MD5('entry_' || i::TEXT), -- Vereinfachter Hash
      CASE WHEN i = 1 THEN '0' ELSE MD5('entry_' || (i-1)::TEXT) END
    );
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 40 Kassenbuch-Einträge';
  RAISE NOTICE '';

  -- ============================================================================
  -- 8. LIEFERSCHEINE (15 Stück)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 15 Lieferscheine...';

  FOR i IN 1..15 LOOP
    v_vehicle_id := v_vehicle_ids[1 + (i % array_length(v_vehicle_ids, 1))];
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];

    INSERT INTO delivery_notes (
      tenant_id,
      delivery_note_number,
      customer_id,
      vehicle_id,
      delivery_date,
      delivery_address_line1,
      delivery_zip_code,
      delivery_city,
      status,
      notes
    )
    VALUES (
      v_tenant_id,
      'LS-2024-' || LPAD(i::TEXT, 4, '0'),
      v_customer_id,
      v_vehicle_id,
      CURRENT_DATE - (i * 1.5)::INT,
      'Lieferadresse ' || i,
      LPAD((20000 + i * 100)::TEXT, 5, '0'),
      CASE i % 3
        WHEN 0 THEN 'Berlin'
        WHEN 1 THEN 'München'
        ELSE 'Hamburg'
      END,
      CASE i % 4
        WHEN 0 THEN 'planned'
        WHEN 1 THEN 'in_progress'
        WHEN 2 THEN 'delivered'
        ELSE 'cancelled'
      END,
      'Testlieferung ' || i || ' - Bitte Ware bei Empfang prüfen'
    );
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 15 Lieferscheine';
  RAISE NOTICE '';

  -- ============================================================================
  -- ZUSAMMENFASSUNG
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '                    TESTDATEN ERFOLGREICH ERSTELLT                         ';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  Kunden:              %', array_length(v_customer_ids, 1);
  RAISE NOTICE '  Artikel:             %', array_length(v_article_ids, 1);
  RAISE NOTICE '  Fahrzeuge:           %', array_length(v_vehicle_ids, 1);
  RAISE NOTICE '  Rechnungen:          %', array_length(v_invoice_ids, 1);
  RAISE NOTICE '  Angebote:            10';
  RAISE NOTICE '  Kassenbuch-Einträge: 40';
  RAISE NOTICE '  Lieferscheine:       15';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Alle Testdaten wurden erfolgreich erstellt!';
  RAISE NOTICE '✓ User: juergen.rosskamp@gmail.com';
  RAISE NOTICE '✓ Tenant ID: %', v_tenant_id;
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '                              FEHLER                                       ';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Fehler beim Erstellen der Testdaten:';
    RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    RAISE NOTICE 'SQLERRM: %', SQLERRM;
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE;
END $$;
