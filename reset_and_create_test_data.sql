/*
  ============================================================================
  TESTDATEN ZURÜCKSETZEN UND NEU ERSTELLEN
  ============================================================================

  Dieses Script:
  1. Löscht ALLE existierenden Testdaten (CASCADE)
  2. Erstellt komplett neue, vollständig verknüpfte Testdaten

  ⚠️ WARNUNG: Dieses Script löscht ALLE Daten aus der Datenbank!
  Nur in Entwicklungs-/Testumgebungen verwenden!
*/

DO $$
DECLARE
  -- IDs für Referenzen
  v_tenant_id uuid;
  v_user_id uuid;

  -- Arrays für IDs
  v_customer_ids uuid[];
  v_article_ids uuid[];
  v_delivery_location_ids uuid[];
  v_vehicle_ids uuid[];
  v_invoice_ids uuid[];
  v_receipt_ids uuid[];

  -- Temporäre Variablen
  v_customer_id uuid;
  v_article_id uuid;
  v_location_id uuid;
  v_vehicle_id uuid;
  v_invoice_id uuid;
  v_receipt_id uuid;

  -- Counter
  i integer;
  j integer;

BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           LÖSCHE ALTE TESTDATEN UND ERSTELLE NEUE                     ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- ============================================================================
  -- SCHRITT 1: ALTE DATEN LÖSCHEN
  -- ============================================================================
  RAISE NOTICE '🗑️  Lösche alte Testdaten...';
  RAISE NOTICE '';

  -- Lösche in der richtigen Reihenfolge (Abhängigkeiten beachten)
  DELETE FROM invoice_payments;
  RAISE NOTICE '   ✓ Gelöscht: invoice_payments';

  DELETE FROM invoice_items;
  RAISE NOTICE '   ✓ Gelöscht: invoice_items';

  DELETE FROM invoices;
  RAISE NOTICE '   ✓ Gelöscht: invoices';

  DELETE FROM quotes;
  RAISE NOTICE '   ✓ Gelöscht: quotes';

  DELETE FROM delivery_photos;
  RAISE NOTICE '   ✓ Gelöscht: delivery_photos';

  DELETE FROM delivery_notes;
  RAISE NOTICE '   ✓ Gelöscht: delivery_notes';

  DELETE FROM cashbook_entries;
  RAISE NOTICE '   ✓ Gelöscht: cashbook_entries';

  DELETE FROM receipts;
  RAISE NOTICE '   ✓ Gelöscht: receipts';

  DELETE FROM monthly_closings;
  RAISE NOTICE '   ✓ Gelöscht: monthly_closings';

  DELETE FROM article_location_prices;
  RAISE NOTICE '   ✓ Gelöscht: article_location_prices';

  DELETE FROM article_customer_prices;
  RAISE NOTICE '   ✓ Gelöscht: article_customer_prices';

  DELETE FROM article_quantity_prices;
  RAISE NOTICE '   ✓ Gelöscht: article_quantity_prices';

  DELETE FROM delivery_locations;
  RAISE NOTICE '   ✓ Gelöscht: delivery_locations';

  DELETE FROM articles;
  RAISE NOTICE '   ✓ Gelöscht: articles';

  DELETE FROM customers;
  RAISE NOTICE '   ✓ Gelöscht: customers';

  DELETE FROM vehicles;
  RAISE NOTICE '   ✓ Gelöscht: vehicles';

  DELETE FROM support_tickets;
  RAISE NOTICE '   ✓ Gelöscht: support_tickets';

  DELETE FROM users;
  RAISE NOTICE '   ✓ Gelöscht: users';

  DELETE FROM tenants;
  RAISE NOTICE '   ✓ Gelöscht: tenants';

  RAISE NOTICE '';
  RAISE NOTICE '✅ Alle alten Daten gelöscht!';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ============================================================================
  -- SCHRITT 2: NEUE TESTDATEN ERSTELLEN
  -- ============================================================================
  RAISE NOTICE '📝 Erstelle neue Testdaten...';
  RAISE NOTICE '';

  -- ============================================================================
  -- 1. TENANT & USER
  -- ============================================================================
  RAISE NOTICE '── Erstelle Tenant und User...';

  INSERT INTO tenants (
    name,
    tax_id,
    vat_id,
    address_line1,
    zip_code,
    city,
    country,
    phone,
    email,
    website,
    bank_name,
    iban,
    bic
  )
  VALUES (
    'Musterbau GmbH',
    'DE123456789',
    'DE999999999',
    'Hauptstraße 1',
    '10115',
    'Berlin',
    'DE',
    '+49 30 12345678',
    'info@musterbau.de',
    'www.musterbau.de',
    'Sparkasse Berlin',
    'DE89370400440532013000',
    'DEUTDEDBBER'
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO users (
    id,
    tenant_id,
    email,
    full_name,
    role
  )
  VALUES (
    gen_random_uuid(),
    v_tenant_id,
    'admin@musterbau.de',
    'Max Mustermann',
    'admin'
  )
  RETURNING id INTO v_user_id;

  RAISE NOTICE '   ✓ Tenant: Musterbau GmbH';
  RAISE NOTICE '   ✓ User: Max Mustermann';
  RAISE NOTICE '';

  -- ============================================================================
  -- 2. KUNDEN (20)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 20 Kunden...';

  v_customer_ids := ARRAY[]::uuid[];

  FOR i IN 1..20 LOOP
    INSERT INTO customers (
      tenant_id,
      customer_number,
      type,
      company_name,
      contact_person,
      email,
      phone,
      mobile,
      address_line1,
      address_line2,
      zip_code,
      city,
      country,
      tax_id,
      vat_id,
      payment_terms,
      credit_limit,
      is_active,
      notes
    )
    VALUES (
      v_tenant_id,
      'K' || LPAD(i::TEXT, 5, '0'),
      CASE WHEN i % 4 = 0 THEN 'private' ELSE 'business' END,
      'Kunde ' || i || ' ' || CASE WHEN i % 4 = 0 THEN '' ELSE 'GmbH' END,
      'Ansprechpartner ' || i,
      'kunde' || i || '@example.com',
      '+49 ' || (30 + i) || ' ' || LPAD((1000000 + i * 123)::TEXT, 7, '0'),
      '+49 ' || (151 + i) || ' ' || LPAD((1000000 + i * 456)::TEXT, 7, '0'),
      'Kundenstraße ' || i,
      CASE WHEN i % 3 = 0 THEN 'Gebäude ' || CHR(65 + (i % 26)) ELSE NULL END,
      LPAD((10000 + i * 100)::TEXT, 5, '0'),
      CASE i % 5
        WHEN 0 THEN 'Berlin'
        WHEN 1 THEN 'München'
        WHEN 2 THEN 'Hamburg'
        WHEN 3 THEN 'Köln'
        ELSE 'Frankfurt'
      END,
      'DE',
      CASE WHEN i % 4 != 0 THEN 'DE' || LPAD((100000000 + i * 11111)::TEXT, 9, '0') ELSE NULL END,
      CASE WHEN i % 4 != 0 THEN 'DE' || LPAD((100000000 + i * 22222)::TEXT, 9, '0') ELSE NULL END,
      CASE i % 4
        WHEN 0 THEN 'net_7'
        WHEN 1 THEN 'net_14'
        WHEN 2 THEN 'net_30'
        ELSE 'net_60'
      END,
      CASE WHEN i % 3 = 0 THEN 50000.00 ELSE NULL END,
      i % 10 != 0,
      'Testkunde ' || i
    )
    RETURNING id INTO v_customer_id;

    v_customer_ids := array_append(v_customer_ids, v_customer_id);
  END LOOP;

  RAISE NOTICE '   ✓ 20 Kunden erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 3. ARTIKEL (30)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 30 Artikel...';

  v_article_ids := ARRAY[]::uuid[];

  FOR i IN 1..30 LOOP
    INSERT INTO articles (
      tenant_id,
      article_number,
      name,
      description,
      category,
      unit,
      unit_price,
      base_price,
      vat_rate,
      stock_quantity,
      min_stock_level,
      is_active,
      notes
    )
    VALUES (
      v_tenant_id,
      'ART-' || LPAD(i::TEXT, 5, '0'),
      CASE i % 6
        WHEN 0 THEN 'Zement Portland ' || i || 'kg'
        WHEN 1 THEN 'Sand Körnung ' || i
        WHEN 2 THEN 'Kies Fraktion ' || i
        WHEN 3 THEN 'Beton C' || (20 + i % 5)
        WHEN 4 THEN 'Mörtel Typ ' || i
        ELSE 'Spezial Nr. ' || i
      END,
      'Artikel ' || i || ' Beschreibung',
      CASE i % 5
        WHEN 0 THEN 'Bindemittel'
        WHEN 1 THEN 'Zuschlag'
        WHEN 2 THEN 'Transportbeton'
        WHEN 3 THEN 'Mörtel'
        ELSE 'Sonderprodukte'
      END,
      CASE i % 4
        WHEN 0 THEN 't'
        WHEN 1 THEN 'm³'
        WHEN 2 THEN 'kg'
        ELSE 'Stk'
      END,
      ROUND((50 + i * 15.5)::numeric, 2),
      ROUND((45 + i * 14)::numeric, 2),
      CASE WHEN i % 7 = 0 THEN 7.00 ELSE 19.00 END,
      (100 + i * 50)::numeric,
      CASE WHEN i % 3 = 0 THEN (50 + i * 10)::numeric ELSE NULL END,
      i % 12 != 0,
      'Testartikel ' || i
    )
    RETURNING id INTO v_article_id;

    v_article_ids := array_append(v_article_ids, v_article_id);
  END LOOP;

  RAISE NOTICE '   ✓ 30 Artikel erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 4. LIEFERORTE (15)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 15 Lieferorte...';

  v_delivery_location_ids := ARRAY[]::uuid[];

  FOR i IN 1..15 LOOP
    v_customer_id := v_customer_ids[1 + (i % LEAST(10, array_length(v_customer_ids, 1)))];

    INSERT INTO delivery_locations (
      tenant_id,
      customer_id,
      location_number,
      name,
      contact_person,
      phone,
      email,
      address_line1,
      address_line2,
      zip_code,
      city,
      country,
      delivery_instructions,
      access_notes,
      gps_latitude,
      gps_longitude,
      is_active
    )
    VALUES (
      v_tenant_id,
      v_customer_id,
      'K' || LPAD(((i % 10) + 1)::TEXT, 5, '0') || '-' || LPAD((i % 3 + 1)::TEXT, 3, '0'),
      'Baustelle ' || i,
      'Bauleiter ' || i,
      '+49 171 ' || LPAD((2000000 + i * 789)::TEXT, 7, '0'),
      'baustelle' || i || '@example.com',
      'Baustellenstraße ' || i,
      'Bauabschnitt ' || CHR(65 + (i % 5)),
      LPAD((20000 + i * 150)::TEXT, 5, '0'),
      CASE i % 6
        WHEN 0 THEN 'Berlin'
        WHEN 1 THEN 'Potsdam'
        WHEN 2 THEN 'Hamburg'
        WHEN 3 THEN 'München'
        WHEN 4 THEN 'Köln'
        ELSE 'Frankfurt'
      END,
      'DE',
      'Anlieferung werktags 7-16 Uhr',
      'Tor-Code: ' || (1000 + i)::TEXT,
      52.5200 + (i * 0.01),
      13.4050 + (i * 0.015),
      i % 8 != 0
    )
    RETURNING id INTO v_location_id;

    v_delivery_location_ids := array_append(v_delivery_location_ids, v_location_id);
  END LOOP;

  RAISE NOTICE '   ✓ 15 Lieferorte erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 5. KUNDENPREISE (50)
  -- ============================================================================
  RAISE NOTICE '── Erstelle kundenspezifische Preise...';

  FOR i IN 1..50 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];
    v_article_id := v_article_ids[1 + (i % array_length(v_article_ids, 1))];

    BEGIN
      INSERT INTO article_customer_prices (
        tenant_id,
        article_id,
        customer_id,
        min_quantity,
        unit_price,
        is_active,
        notes
      )
      VALUES (
        v_tenant_id,
        v_article_id,
        v_customer_id,
        CASE i % 4 WHEN 0 THEN 0 WHEN 1 THEN 10 WHEN 2 THEN 50 ELSE 100 END,
        ROUND((40 + i * 8.3)::numeric, 2),
        true,
        'Rahmenvertrag'
      );
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;

  RAISE NOTICE '   ✓ ~50 kundenspezifische Preise erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 6. LIEFERORTPREISE (20)
  -- ============================================================================
  RAISE NOTICE '── Erstelle lieferortspezifische Preise...';

  FOR i IN 1..20 LOOP
    v_location_id := v_delivery_location_ids[1 + (i % array_length(v_delivery_location_ids, 1))];
    v_article_id := v_article_ids[1 + ((i * 3) % array_length(v_article_ids, 1))];

    BEGIN
      INSERT INTO article_location_prices (
        tenant_id,
        article_id,
        delivery_location_id,
        min_quantity,
        unit_price,
        is_active,
        notes
      )
      VALUES (
        v_tenant_id,
        v_article_id,
        v_location_id,
        CASE i % 3 WHEN 0 THEN 0 WHEN 1 THEN 25 ELSE 75 END,
        ROUND((35 + i * 12.5)::numeric, 2),
        true,
        'Baustellenpreis'
      );
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;

  RAISE NOTICE '   ✓ ~20 lieferortspezifische Preise erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 7. MENGENSTAFFELN (30)
  -- ============================================================================
  RAISE NOTICE '── Erstelle Mengenstaffel-Preise...';

  FOR i IN 1..10 LOOP
    v_article_id := v_article_ids[1 + (i % array_length(v_article_ids, 1))];

    FOR j IN 1..3 LOOP
      BEGIN
        INSERT INTO article_quantity_prices (
          tenant_id,
          article_id,
          min_quantity,
          unit_price,
          is_active
        )
        VALUES (
          v_tenant_id,
          v_article_id,
          CASE j WHEN 1 THEN 10 WHEN 2 THEN 50 ELSE 100 END,
          ROUND((60 - j * 5 + i * 10)::numeric, 2),
          true
        );
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE '   ✓ ~30 Mengenstaffel-Preise erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 8. FAHRZEUGE (5)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 5 Fahrzeuge...';

  v_vehicle_ids := ARRAY[]::uuid[];

  FOR i IN 1..5 LOOP
    INSERT INTO vehicles (
      tenant_id,
      license_plate,
      vehicle_type,
      make,
      model,
      year,
      capacity,
      is_active
    )
    VALUES (
      v_tenant_id,
      'B-MB-' || LPAD((1000 + i)::TEXT, 4, '0'),
      CASE i % 3 WHEN 0 THEN 'truck' WHEN 1 THEN 'van' ELSE 'trailer' END,
      CASE i % 3 WHEN 0 THEN 'Mercedes' WHEN 1 THEN 'MAN' ELSE 'Iveco' END,
      'Modell ' || (2020 + i),
      2020 + i,
      CASE i % 3 WHEN 0 THEN 26000 WHEN 1 THEN 12000 ELSE 40000 END,
      i != 5
    )
    RETURNING id INTO v_vehicle_id;

    v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle_id);
  END LOOP;

  RAISE NOTICE '   ✓ 5 Fahrzeuge erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 9. RECHNUNGEN MIT POSITIONEN (30)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 30 Rechnungen mit Positionen...';

  v_invoice_ids := ARRAY[]::uuid[];

  FOR i IN 1..30 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];
    v_location_id := CASE WHEN i % 2 = 0 THEN v_delivery_location_ids[1 + (i % array_length(v_delivery_location_ids, 1))] ELSE NULL END;

    INSERT INTO invoices (
      tenant_id,
      customer_id,
      customer_snapshot,
      invoice_number,
      invoice_date,
      delivery_date,
      due_date,
      delivery_location_id,
      status,
      payment_status,
      payment_terms,
      reference_number,
      subtotal,
      total_vat,
      total,
      customer_notes,
      created_by
    )
    SELECT
      v_tenant_id,
      v_customer_id,
      jsonb_build_object(
        'customer_number', c.customer_number,
        'company_name', c.company_name,
        'address_line1', c.address_line1,
        'zip_code', c.zip_code,
        'city', c.city
      ),
      'RE-2024-' || LPAD(i::TEXT, 5, '0'),
      CURRENT_DATE - (i * 3),
      CASE WHEN i % 3 = 0 THEN CURRENT_DATE - (i * 3) + 2 ELSE NULL END,
      CURRENT_DATE - (i * 3) + 14,
      v_location_id,
      CASE i % 6 WHEN 0 THEN 'draft' WHEN 1 THEN 'sent' WHEN 2 THEN 'sent' WHEN 3 THEN 'paid' WHEN 4 THEN 'partially_paid' ELSE 'overdue' END,
      CASE i % 6 WHEN 3 THEN 'paid' WHEN 4 THEN 'partially_paid' ELSE 'unpaid' END,
      c.payment_terms,
      'PO-' || LPAD((i * 7)::TEXT, 6, '0'),
      0, 0, 0,
      'Vielen Dank für Ihren Auftrag.',
      v_user_id
    FROM customers c
    WHERE c.id = v_customer_id
    RETURNING id INTO v_invoice_id;

    v_invoice_ids := array_append(v_invoice_ids, v_invoice_id);

    -- Positionen (2-7 pro Rechnung)
    FOR j IN 1..(2 + (i % 6)) LOOP
      v_article_id := v_article_ids[1 + ((i * 7 + j * 3) % array_length(v_article_ids, 1))];

      INSERT INTO invoice_items (
        invoice_id,
        tenant_id,
        position_number,
        article_id,
        description,
        quantity,
        unit,
        unit_price,
        discount_percentage,
        vat_rate,
        vat_amount,
        net_amount,
        total_amount,
        delivery_location_id
      )
      SELECT
        v_invoice_id,
        v_tenant_id,
        j,
        v_article_id,
        a.name,
        (5 + (j * i) % 50)::numeric,
        a.unit,
        a.unit_price,
        CASE WHEN i % 5 = 0 AND j = 1 THEN 10.00 ELSE 0 END,
        a.vat_rate,
        ROUND((5 + (j * i) % 50) * a.unit_price * (1 - CASE WHEN i % 5 = 0 AND j = 1 THEN 0.10 ELSE 0 END) * a.vat_rate / 100, 2),
        ROUND((5 + (j * i) % 50) * a.unit_price * (1 - CASE WHEN i % 5 = 0 AND j = 1 THEN 0.10 ELSE 0 END), 2),
        ROUND((5 + (j * i) % 50) * a.unit_price * (1 - CASE WHEN i % 5 = 0 AND j = 1 THEN 0.10 ELSE 0 END) * (1 + a.vat_rate / 100), 2),
        CASE WHEN v_location_id IS NOT NULL AND j % 2 = 0 THEN v_location_id ELSE NULL END
      FROM articles a
      WHERE a.id = v_article_id;
    END LOOP;

    -- Summen aktualisieren
    UPDATE invoices
    SET
      subtotal = (SELECT COALESCE(SUM(net_amount), 0) FROM invoice_items WHERE invoice_id = v_invoice_id),
      total_vat = (SELECT COALESCE(SUM(vat_amount), 0) FROM invoice_items WHERE invoice_id = v_invoice_id),
      total = (SELECT COALESCE(SUM(total_amount), 0) FROM invoice_items WHERE invoice_id = v_invoice_id)
    WHERE id = v_invoice_id;

    -- Zahlungen für bezahlte Rechnungen
    IF i % 6 = 3 THEN
      INSERT INTO invoice_payments (tenant_id, invoice_id, amount, payment_date, payment_method, created_by)
      SELECT v_tenant_id, v_invoice_id, total, invoice_date + INTERVAL '7 days', 'bank_transfer', v_user_id
      FROM invoices WHERE id = v_invoice_id;

      UPDATE invoices SET amount_paid = total WHERE id = v_invoice_id;
    ELSIF i % 6 = 4 THEN
      INSERT INTO invoice_payments (tenant_id, invoice_id, amount, payment_date, payment_method, created_by)
      SELECT v_tenant_id, v_invoice_id, ROUND(total * 0.60, 2), invoice_date + INTERVAL '5 days', 'bank_transfer', v_user_id
      FROM invoices WHERE id = v_invoice_id;

      UPDATE invoices SET amount_paid = ROUND(total * 0.60, 2) WHERE id = v_invoice_id;
    END IF;
  END LOOP;

  RAISE NOTICE '   ✓ 30 Rechnungen mit ~120 Positionen erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 10. LIEFERSCHEINE (25)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 25 Lieferscheine...';

  FOR i IN 1..25 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];
    v_vehicle_id := v_vehicle_ids[1 + (i % array_length(v_vehicle_ids, 1))];
    v_invoice_id := CASE WHEN i <= array_length(v_invoice_ids, 1) THEN v_invoice_ids[i] ELSE NULL END;
    v_location_id := v_delivery_location_ids[1 + (i % array_length(v_delivery_location_ids, 1))];

    INSERT INTO delivery_notes (
      tenant_id,
      delivery_note_number,
      invoice_id,
      customer_id,
      delivery_location_id,
      assigned_vehicle_id,
      assigned_driver_id,
      delivery_date,
      delivery_address_line1,
      delivery_zip_code,
      delivery_city,
      items,
      status,
      created_by
    )
    SELECT
      v_tenant_id,
      'LS-2024-' || LPAD(i::TEXT, 5, '0'),
      v_invoice_id,
      v_customer_id,
      v_location_id,
      v_vehicle_id,
      v_user_id,
      CURRENT_DATE - (i * 2),
      dl.address_line1,
      dl.zip_code,
      dl.city,
      jsonb_build_array(
        jsonb_build_object('description', 'Artikel 1', 'quantity', (10 + i * 3)::numeric, 'unit', 't'),
        jsonb_build_object('description', 'Artikel 2', 'quantity', (5 + i * 2)::numeric, 'unit', 'm³')
      ),
      CASE i % 4 WHEN 0 THEN 'planned' WHEN 1 THEN 'in_progress' WHEN 2 THEN 'delivered' ELSE 'partially_delivered' END,
      v_user_id
    FROM delivery_locations dl
    WHERE dl.id = v_location_id;
  END LOOP;

  RAISE NOTICE '   ✓ 25 Lieferscheine erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 11. ANGEBOTE (15)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 15 Angebote...';

  FOR i IN 1..15 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];

    INSERT INTO quotes (
      tenant_id,
      customer_id,
      quote_number,
      quote_date,
      valid_until,
      status,
      items,
      subtotal,
      vat_amount,
      total_amount,
      created_by
    )
    VALUES (
      v_tenant_id,
      v_customer_id,
      'ANG-2024-' || LPAD(i::TEXT, 5, '0'),
      CURRENT_DATE - (i * 5),
      CURRENT_DATE - (i * 5) + INTERVAL '30 days',
      CASE i % 5 WHEN 0 THEN 'draft' WHEN 1 THEN 'sent' WHEN 2 THEN 'sent' WHEN 3 THEN 'accepted' ELSE 'declined' END,
      jsonb_build_array(
        jsonb_build_object('description', 'Position 1', 'quantity', (10 + i * 5)::numeric, 'unit_price', (100 + i * 10)::numeric, 'vat_rate', 19::numeric),
        jsonb_build_object('description', 'Position 2', 'quantity', (5 + i * 2)::numeric, 'unit_price', (150 + i * 8)::numeric, 'vat_rate', 19::numeric)
      ),
      ROUND((1500 + i * 450)::numeric, 2),
      ROUND((1500 + i * 450) * 0.19, 2),
      ROUND((1500 + i * 450) * 1.19, 2),
      v_user_id
    );
  END LOOP;

  RAISE NOTICE '   ✓ 15 Angebote erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 12. KASSENBUCH (40)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 40 Kassenbuch-Einträge...';

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
      previous_hash,
      created_by
    )
    VALUES (
      v_tenant_id,
      CURRENT_DATE - (i * 2),
      'KB-' || LPAD(i::TEXT, 6, '0'),
      CASE WHEN i % 5 = 0 THEN 'income' ELSE 'expense' END,
      CASE i % 8 WHEN 0 THEN '4000' WHEN 1 THEN '6805' WHEN 2 THEN '6670' ELSE '6300' END,
      'Kassenbuch Eintrag ' || i,
      ROUND((15 + (i * 23) % 800)::numeric, 2),
      CASE WHEN i % 4 = 0 THEN 0 WHEN i % 4 = 1 THEN 7 ELSE 19 END,
      ROUND((15 + (i * 23) % 800) * CASE WHEN i % 4 = 0 THEN 0 WHEN i % 4 = 1 THEN 0.07 ELSE 0.19 END, 2),
      ROUND((15 + (i * 23) % 800) / (1 + CASE WHEN i % 4 = 0 THEN 0 WHEN i % 4 = 1 THEN 0.07 ELSE 0.19 END), 2),
      'KB-REF-' || LPAD(i::TEXT, 5, '0'),
      5000 + (i * CASE WHEN i % 5 = 0 THEN 50 ELSE -30 END),
      MD5('entry_' || i::TEXT),
      CASE WHEN i = 1 THEN '0' ELSE MD5('entry_' || (i-1)::TEXT) END,
      v_user_id
    );
  END LOOP;

  RAISE NOTICE '   ✓ 40 Kassenbuch-Einträge erstellt';
  RAISE NOTICE '';

  -- ============================================================================
  -- 13. BELEGE (10)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 10 Belege...';

  v_receipt_ids := ARRAY[]::uuid[];

  FOR i IN 1..10 LOOP
    INSERT INTO receipts (
      tenant_id,
      receipt_number,
      receipt_date,
      vendor_name,
      category,
      amount,
      vat_rate,
      vat_amount,
      description,
      file_url,
      created_by
    )
    VALUES (
      v_tenant_id,
      'BEL-' || LPAD(i::TEXT, 6, '0'),
      CURRENT_DATE - (i * 7),
      'Lieferant ' || i,
      CASE i % 5 WHEN 0 THEN 'fuel' WHEN 1 THEN 'office_supplies' WHEN 2 THEN 'meals' ELSE 'materials' END,
      ROUND((25 + i * 37.5)::numeric, 2),
      CASE WHEN i % 3 = 0 THEN 7.00 ELSE 19.00 END,
      ROUND((25 + i * 37.5) * CASE WHEN i % 3 = 0 THEN 0.07 ELSE 0.19 END, 2),
      'Beleg ' || i,
      '/receipts/beleg_' || i || '.pdf',
      v_user_id
    )
    RETURNING id INTO v_receipt_id;

    v_receipt_ids := array_append(v_receipt_ids, v_receipt_id);
  END LOOP;

  -- Verknüpfe 3 Belege mit Kassenbuch
  UPDATE cashbook_entries SET receipt_id = v_receipt_ids[1] WHERE document_number = 'KB-000002';
  UPDATE cashbook_entries SET receipt_id = v_receipt_ids[2] WHERE document_number = 'KB-000005';
  UPDATE cashbook_entries SET receipt_id = v_receipt_ids[3] WHERE document_number = 'KB-000008';

  RAISE NOTICE '   ✓ 10 Belege erstellt (3 mit Kassenbuch verknüpft)';
  RAISE NOTICE '';

  -- ============================================================================
  -- ABSCHLUSS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║              ✅ TESTDATEN ERFOLGREICH ERSTELLT                        ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ZUSAMMENFASSUNG:';
  RAISE NOTICE '   • Tenant: Musterbau GmbH';
  RAISE NOTICE '   • Kunden: 20';
  RAISE NOTICE '   • Artikel: 30';
  RAISE NOTICE '   • Lieferorte: 15';
  RAISE NOTICE '   • Kundenpreise: ~50';
  RAISE NOTICE '   • Lieferortpreise: ~20';
  RAISE NOTICE '   • Mengenstaffeln: ~30';
  RAISE NOTICE '   • Fahrzeuge: 5';
  RAISE NOTICE '   • Rechnungen: 30 (~120 Positionen)';
  RAISE NOTICE '   • Lieferscheine: 25';
  RAISE NOTICE '   • Angebote: 15';
  RAISE NOTICE '   • Kassenbuch: 40 Einträge';
  RAISE NOTICE '   • Belege: 10';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Alle Daten vollständig verknüpft!';
  RAISE NOTICE '';

END $$;
