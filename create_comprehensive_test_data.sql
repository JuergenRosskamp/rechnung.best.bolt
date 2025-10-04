/*
  ============================================================================
  UMFASSENDE TESTDATEN FÜR ALLE TABELLEN
  ============================================================================

  Dieses Script erstellt vollständige und verknüpfte Testdaten für:
  - 1 Tenant
  - 1 User
  - 20 Kunden (mit verschiedenen Zahlungskonditionen)
  - 30 Artikel (verschiedene Kategorien, MwSt-Sätze)
  - 15 Lieferorte (zu verschiedenen Kunden)
  - 50 Kundenspezifische Preise
  - 20 Lieferort-spezifische Preise
  - 30 Mengenstaffel-Preise
  - 5 Fahrzeuge
  - 30 Rechnungen (mit Positionen und Verknüpfungen)
  - 100 Rechnungspositionen (verknüpft mit Rechnungen)
  - 25 Lieferscheine (mit items und Verknüpfungen)
  - 15 Angebote
  - 40 Kassenbuch-Einträge
  - 10 Belege (Receipts)

  Alle Daten sind sinnvoll miteinander verknüpft.
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
  RAISE NOTICE '║        ERSTELLE UMFASSENDE TESTDATEN FÜR ALLE TABELLEN               ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- ============================================================================
  -- 1. TENANT & USER
  -- ============================================================================
  RAISE NOTICE '── Erstelle Tenant und User...';

  -- Tenant erstellen
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
    'Test GmbH',
    'DE123456789',
    'DE999999999',
    'Musterstraße 123',
    '10115',
    'Berlin',
    'DE',
    '+49 30 12345678',
    'info@test-gmbh.de',
    'www.test-gmbh.de',
    'Deutsche Bank',
    'DE89370400440532013000',
    'DEUTDEDBBER'
  )
  RETURNING id INTO v_tenant_id;

  -- User erstellen
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
    'test@test-gmbh.de',
    'Test Administrator',
    'admin'
  )
  RETURNING id INTO v_user_id;

  RAISE NOTICE '   ✓ Tenant ID: %', v_tenant_id;
  RAISE NOTICE '   ✓ User ID: %', v_user_id;
  RAISE NOTICE '';

  -- ============================================================================
  -- 2. KUNDEN (20 Stück mit verschiedenen Eigenschaften)
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
      'Kunde ' || i || ' GmbH',
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
      i % 10 != 0, -- Jeder 10. Kunde ist inaktiv
      'Testkunde ' || i || ' - ' || CASE WHEN i % 3 = 0 THEN 'VIP Kunde' WHEN i % 5 = 0 THEN 'Neukunde' ELSE 'Stammkunde' END
    )
    RETURNING id INTO v_customer_id;

    v_customer_ids := array_append(v_customer_ids, v_customer_id);
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 20 Kunden';
  RAISE NOTICE '';

  -- ============================================================================
  -- 3. ARTIKEL (30 Stück mit verschiedenen Eigenschaften)
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
        WHEN 1 THEN 'Sand Körnung ' || i || 'mm'
        WHEN 2 THEN 'Kies Fraktion ' || i || '/' || (i+5)
        WHEN 3 THEN 'Beton C' || (20 + i % 5) || '/' || (25 + i % 5)
        WHEN 4 THEN 'Mörtel ' || CASE WHEN i % 2 = 0 THEN 'Normal' ELSE 'Schnell' END
        ELSE 'Spezialprodukt Nr. ' || i
      END,
      'Testprodukt ' || i || ' - ' || CASE
        WHEN i % 3 = 0 THEN 'Premium Qualität'
        WHEN i % 5 = 0 THEN 'Standard Qualität'
        ELSE 'Baustellenware'
      END,
      CASE i % 5
        WHEN 0 THEN 'Bindemittel'
        WHEN 1 THEN 'Zuschlag'
        WHEN 2 THEN 'Transportbeton'
        WHEN 3 THEN 'Mörtel'
        ELSE 'Sonderprodukte'
      END,
      CASE i % 4
        WHEN 0 THEN 't'    -- Tonnen
        WHEN 1 THEN 'm³'   -- Kubikmeter
        WHEN 2 THEN 'kg'   -- Kilogramm
        ELSE 'Stk'         -- Stück
      END,
      ROUND((50 + i * 15.5)::numeric, 2), -- Preis zwischen 65€ und 515€
      ROUND((45 + i * 14)::numeric, 2),   -- Basispreis etwas niedriger
      CASE
        WHEN i % 7 = 0 THEN 7.00   -- Reduzierter Steuersatz
        ELSE 19.00                 -- Normaler Steuersatz
      END,
      CASE
        WHEN i % 4 = 0 THEN (100 + i * 50)::numeric  -- Viel auf Lager
        WHEN i % 4 = 1 THEN (10 + i * 5)::numeric    -- Mittel auf Lager
        ELSE 0                                       -- Nicht auf Lager
      END,
      CASE WHEN i % 3 = 0 THEN (50 + i * 10)::numeric ELSE NULL END,
      i % 12 != 0, -- Jeder 12. Artikel ist inaktiv
      'Testartikel ' || i || ' - ' || CASE
        WHEN i % 2 = 0 THEN 'Schnelle Lieferung'
        ELSE 'Auf Bestellung'
      END
    )
    RETURNING id INTO v_article_id;

    v_article_ids := array_append(v_article_ids, v_article_id);
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 30 Artikel';
  RAISE NOTICE '';

  -- ============================================================================
  -- 4. LIEFERORTE (15 Stück zu verschiedenen Kunden)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 15 Lieferorte...';

  v_delivery_location_ids := ARRAY[]::uuid[];

  FOR i IN 1..15 LOOP
    -- Wähle einen Kunden aus (bevorzugt die ersten 10 Kunden)
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
      'Baustelle ' || i || ' - ' || CASE i % 4
        WHEN 0 THEN 'Neubau Wohnanlage'
        WHEN 1 THEN 'Straßenbau Projekt'
        WHEN 2 THEN 'Gewerbeobjekt'
        ELSE 'Renovierung Altbau'
      END,
      'Bauleiter ' || CHR(65 + (i % 26)) || '. ' || CASE i % 3 WHEN 0 THEN 'Müller' WHEN 1 THEN 'Schmidt' ELSE 'Meyer' END,
      '+49 ' || (171 + i) || ' ' || LPAD((2000000 + i * 789)::TEXT, 7, '0'),
      'baustelle' || i || '@kunde' || (1 + (i % 10)) || '.de',
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
      CASE i % 5
        WHEN 0 THEN 'Anlieferung nur werktags 7-16 Uhr. Kranentladung vorhanden.'
        WHEN 1 THEN 'Engere Zufahrt - LKW max. 7,5t. Telefonische Anmeldung 1h vorher.'
        WHEN 2 THEN 'Freie Zufahrt. Entladung durch eigenes Personal.'
        WHEN 3 THEN 'Baustelle nur über Nebeneingang erreichbar. Siehe Lageplan.'
        ELSE 'Anlieferung jederzeit möglich. Abladen an Tor 2.'
      END,
      CASE i % 4
        WHEN 0 THEN 'Tor-Code: 1234# - Klingel bei Pförtner'
        WHEN 1 THEN 'Schlüssel beim Hausmeister abholen (Nebengebäude)'
        WHEN 2 THEN 'Frei zugänglich über Haupteinfahrt'
        ELSE 'Anmeldung bei Sicherheitsdienst erforderlich'
      END,
      52.5200 + (i * 0.01),  -- GPS Berlin Umgebung
      13.4050 + (i * 0.015),
      i % 8 != 0 -- Jeder 8. Standort ist inaktiv
    )
    RETURNING id INTO v_location_id;

    v_delivery_location_ids := array_append(v_delivery_location_ids, v_location_id);
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 15 Lieferorte';
  RAISE NOTICE '';

  -- ============================================================================
  -- 5. KUNDENSPEZIFISCHE PREISE (50 Stück)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 50 kundenspezifische Preise...';

  FOR i IN 1..50 LOOP
    -- Wähle Kunde und Artikel
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
        valid_from,
        valid_until,
        notes
      )
      VALUES (
        v_tenant_id,
        v_article_id,
        v_customer_id,
        CASE i % 4
          WHEN 0 THEN 0      -- Sofort gültig
          WHEN 1 THEN 10     -- Ab 10 Stück
          WHEN 2 THEN 50     -- Ab 50 Stück
          ELSE 100           -- Ab 100 Stück
        END,
        ROUND((40 + i * 8.3)::numeric, 2), -- Rabattierter Preis
        true,
        CURRENT_DATE - (i * 5),
        CASE WHEN i % 5 = 0 THEN CURRENT_DATE + INTERVAL '180 days' ELSE NULL END,
        'Sonderkonditionen für Stammkunde - Rahmenvertrag ' || (2024 - (i % 3))
      );
    EXCEPTION WHEN unique_violation THEN
      -- Überspringe wenn Kombination bereits existiert
      NULL;
    END;
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: ~50 kundenspezifische Preise';
  RAISE NOTICE '';

  -- ============================================================================
  -- 6. LIEFERORT-SPEZIFISCHE PREISE (20 Stück)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 20 lieferortspezifische Preise...';

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
        CASE i % 3
          WHEN 0 THEN 0
          WHEN 1 THEN 25
          ELSE 75
        END,
        ROUND((35 + i * 12.5)::numeric, 2), -- Baustellenpreis
        true,
        'Baustellenpreis inkl. Anfahrt - Gültig für Projekt ' || i
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: ~20 lieferortspezifische Preise';
  RAISE NOTICE '';

  -- ============================================================================
  -- 7. MENGENSTAFFEL-PREISE (30 Stück)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 30 Mengenstaffel-Preise...';

  FOR i IN 1..10 LOOP
    v_article_id := v_article_ids[1 + (i % array_length(v_article_ids, 1))];

    -- Erstelle 3 Staffeln pro Artikel
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
          CASE j
            WHEN 1 THEN 10
            WHEN 2 THEN 50
            ELSE 100
          END,
          ROUND((60 - j * 5 + i * 10)::numeric, 2), -- Preis sinkt mit Menge
          true
        );
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: ~30 Mengenstaffel-Preise';
  RAISE NOTICE '';

  -- ============================================================================
  -- 8. FAHRZEUGE (5 Stück)
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
      notes,
      is_active
    )
    VALUES (
      v_tenant_id,
      'B-TG-' || LPAD((1000 + i)::TEXT, 4, '0'),
      CASE i % 3
        WHEN 0 THEN 'truck'
        WHEN 1 THEN 'van'
        ELSE 'trailer'
      END,
      CASE i % 4
        WHEN 0 THEN 'Mercedes'
        WHEN 1 THEN 'MAN'
        WHEN 2 THEN 'Iveco'
        ELSE 'Scania'
      END,
      CASE i % 3
        WHEN 0 THEN 'Actros ' || (2020 + i)
        WHEN 1 THEN 'TGX ' || (18 + i) || '.XXX'
        ELSE 'Stralis ' || (400 + i * 20)
      END,
      2020 + i,
      CASE i % 3
        WHEN 0 THEN 26000  -- 26 Tonnen
        WHEN 1 THEN 12000  -- 12 Tonnen
        ELSE 40000         -- 40 Tonnen (mit Hänger)
      END,
      'Fahrzeug ' || i || ' - ' || CASE
        WHEN i % 2 = 0 THEN 'Hauptfahrzeug für Baustellen'
        ELSE 'Ersatzfahrzeug und Citytouren'
      END,
      i != 5 -- Fahrzeug 5 ist außer Betrieb
    )
    RETURNING id INTO v_vehicle_id;

    v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle_id);
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 5 Fahrzeuge';
  RAISE NOTICE '';

  -- ============================================================================
  -- 9. RECHNUNGEN MIT POSITIONEN (30 Stück)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 30 Rechnungen mit Positionen...';

  v_invoice_ids := ARRAY[]::uuid[];

  FOR i IN 1..30 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];

    -- Optional: Lieferort zuweisen (50% der Rechnungen)
    IF i % 2 = 0 THEN
      v_location_id := v_delivery_location_ids[1 + (i % array_length(v_delivery_location_ids, 1))];
    ELSE
      v_location_id := NULL;
    END IF;

    -- Kundendetails für Snapshot
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
      internal_notes,
      created_by
    )
    SELECT
      v_tenant_id,
      v_customer_id,
      jsonb_build_object(
        'customer_number', c.customer_number,
        'company_name', c.company_name,
        'contact_person', c.contact_person,
        'address_line1', c.address_line1,
        'zip_code', c.zip_code,
        'city', c.city,
        'country', c.country
      ),
      'RE-2024-' || LPAD(i::TEXT, 5, '0'),
      CURRENT_DATE - (i * 3),
      CASE WHEN i % 3 = 0 THEN CURRENT_DATE - (i * 3) + 2 ELSE NULL END,
      CURRENT_DATE - (i * 3) + 14,
      v_location_id,
      CASE i % 6
        WHEN 0 THEN 'draft'
        WHEN 1 THEN 'sent'
        WHEN 2 THEN 'sent'
        WHEN 3 THEN 'paid'
        WHEN 4 THEN 'partially_paid'
        ELSE 'overdue'
      END,
      CASE i % 6
        WHEN 3 THEN 'paid'
        WHEN 4 THEN 'partially_paid'
        ELSE 'unpaid'
      END,
      c.payment_terms,
      'PO-' || LPAD((i * 7)::TEXT, 6, '0'),
      0, 0, 0, -- Werden durch Positionen berechnet
      'Vielen Dank für Ihren Auftrag. Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.',
      CASE
        WHEN i % 5 = 0 THEN 'VIP Kunde - bevorzugte Behandlung'
        WHEN i % 7 = 0 THEN 'Prüfung Skonto erforderlich'
        ELSE NULL
      END,
      v_user_id
    FROM customers c
    WHERE c.id = v_customer_id
    RETURNING id INTO v_invoice_id;

    v_invoice_ids := array_append(v_invoice_ids, v_invoice_id);

    -- Erstelle 2-7 Rechnungspositionen pro Rechnung
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
        discount_amount,
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
        a.name || ' - Position ' || j,
        (5 + (j * i) % 50)::numeric, -- Menge zwischen 5 und 55
        a.unit,
        CASE
          WHEN v_location_id IS NOT NULL THEN
            COALESCE(
              (SELECT unit_price FROM article_location_prices
               WHERE article_id = v_article_id
               AND delivery_location_id = v_location_id
               AND is_active = true
               LIMIT 1),
              a.unit_price
            )
          ELSE
            COALESCE(
              (SELECT unit_price FROM article_customer_prices
               WHERE article_id = v_article_id
               AND customer_id = v_customer_id
               AND is_active = true
               AND min_quantity <= (5 + (j * i) % 50)
               ORDER BY min_quantity DESC
               LIMIT 1),
              a.unit_price
            )
        END,
        CASE WHEN i % 5 = 0 AND j = 1 THEN 10.00 ELSE 0 END, -- 10% Rabatt auf erste Position jeder 5. Rechnung
        0,
        a.vat_rate,
        ROUND(
          (5 + (j * i) % 50) *
          COALESCE(a.unit_price, 0) *
          (1 - CASE WHEN i % 5 = 0 AND j = 1 THEN 0.10 ELSE 0 END) *
          a.vat_rate / 100,
          2
        ),
        ROUND(
          (5 + (j * i) % 50) *
          COALESCE(a.unit_price, 0) *
          (1 - CASE WHEN i % 5 = 0 AND j = 1 THEN 0.10 ELSE 0 END),
          2
        ),
        ROUND(
          (5 + (j * i) % 50) *
          COALESCE(a.unit_price, 0) *
          (1 - CASE WHEN i % 5 = 0 AND j = 1 THEN 0.10 ELSE 0 END) *
          (1 + a.vat_rate / 100),
          2
        ),
        CASE WHEN v_location_id IS NOT NULL AND j % 2 = 0 THEN v_location_id ELSE NULL END
      FROM articles a
      WHERE a.id = v_article_id;
    END LOOP;

    -- Aktualisiere Rechnungssummen
    UPDATE invoices
    SET
      subtotal = (
        SELECT COALESCE(SUM(net_amount), 0)
        FROM invoice_items
        WHERE invoice_id = v_invoice_id
      ),
      total_vat = (
        SELECT COALESCE(SUM(vat_amount), 0)
        FROM invoice_items
        WHERE invoice_id = v_invoice_id
      ),
      total = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM invoice_items
        WHERE invoice_id = v_invoice_id
      )
    WHERE id = v_invoice_id;

    -- Füge Zahlungen für bezahlte/teilweise bezahlte Rechnungen hinzu
    IF i % 6 = 3 THEN
      -- Voll bezahlt
      INSERT INTO invoice_payments (
        tenant_id,
        invoice_id,
        amount,
        payment_date,
        payment_method,
        reference,
        created_by
      )
      SELECT
        v_tenant_id,
        v_invoice_id,
        total,
        invoice_date + INTERVAL '7 days',
        CASE i % 3 WHEN 0 THEN 'bank_transfer' WHEN 1 THEN 'sepa' ELSE 'cash' END,
        'ZAHLUNG-' || invoice_number,
        v_user_id
      FROM invoices WHERE id = v_invoice_id;

    ELSIF i % 6 = 4 THEN
      -- Teilweise bezahlt (60%)
      INSERT INTO invoice_payments (
        tenant_id,
        invoice_id,
        amount,
        payment_date,
        payment_method,
        reference,
        created_by
      )
      SELECT
        v_tenant_id,
        v_invoice_id,
        ROUND(total * 0.60, 2),
        invoice_date + INTERVAL '5 days',
        'bank_transfer',
        'TEILZAHLUNG-' || invoice_number,
        v_user_id
      FROM invoices WHERE id = v_invoice_id;
    END IF;

    -- Aktualisiere amount_paid
    UPDATE invoices
    SET amount_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM invoice_payments
      WHERE invoice_id = v_invoice_id
    )
    WHERE id = v_invoice_id;

  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 30 Rechnungen mit ~120 Positionen';
  RAISE NOTICE '';

  -- ============================================================================
  -- 10. LIEFERSCHEINE (25 Stück)
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
      delivery_address_line2,
      delivery_zip_code,
      delivery_city,
      delivery_country,
      items,
      status,
      estimated_delivery_time,
      actual_delivery_time,
      recipient_name,
      gps_latitude,
      gps_longitude,
      internal_notes,
      delivery_notes,
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
      dl.address_line2,
      dl.zip_code,
      dl.city,
      dl.country,
      jsonb_build_array(
        jsonb_build_object(
          'article_id', v_article_ids[1 + (i % array_length(v_article_ids, 1))],
          'description', 'Artikel ' || i || ' - Testlieferung',
          'quantity', (10 + i * 3)::numeric,
          'unit', 't'
        ),
        jsonb_build_object(
          'article_id', v_article_ids[1 + ((i + 5) % array_length(v_article_ids, 1))],
          'description', 'Artikel ' || (i + 5) || ' - Testlieferung',
          'quantity', (5 + i * 2)::numeric,
          'unit', 'm³'
        )
      ),
      CASE i % 4
        WHEN 0 THEN 'planned'
        WHEN 1 THEN 'in_progress'
        WHEN 2 THEN 'delivered'
        ELSE 'partially_delivered'
      END,
      '08:00 - 12:00',
      CASE WHEN i % 4 >= 2 THEN '10:' || LPAD((15 + i)::TEXT, 2, '0') ELSE NULL END,
      CASE WHEN i % 4 >= 2 THEN dl.contact_person ELSE NULL END,
      CASE WHEN i % 4 >= 2 THEN dl.gps_latitude ELSE NULL END,
      CASE WHEN i % 4 >= 2 THEN dl.gps_longitude ELSE NULL END,
      CASE
        WHEN i % 3 = 0 THEN 'Bevorzugte Lieferung - VIP Kunde'
        WHEN i % 5 = 0 THEN 'Rückruf nach Anlieferung erforderlich'
        ELSE NULL
      END,
      dl.delivery_instructions,
      v_user_id
    FROM delivery_locations dl
    WHERE dl.id = v_location_id;

  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 25 Lieferscheine';
  RAISE NOTICE '';

  -- ============================================================================
  -- 11. ANGEBOTE (15 Stück)
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
      notes,
      created_by
    )
    VALUES (
      v_tenant_id,
      v_customer_id,
      'ANG-2024-' || LPAD(i::TEXT, 5, '0'),
      CURRENT_DATE - (i * 5),
      CURRENT_DATE - (i * 5) + INTERVAL '30 days',
      CASE i % 5
        WHEN 0 THEN 'draft'
        WHEN 1 THEN 'sent'
        WHEN 2 THEN 'sent'
        WHEN 3 THEN 'accepted'
        ELSE 'declined'
      END,
      jsonb_build_array(
        jsonb_build_object(
          'description', 'Angebot Position 1 - Produkt A',
          'quantity', (10 + i * 5)::numeric,
          'unit_price', (100 + i * 10)::numeric,
          'vat_rate', 19::numeric
        ),
        jsonb_build_object(
          'description', 'Angebot Position 2 - Produkt B',
          'quantity', (5 + i * 2)::numeric,
          'unit_price', (150 + i * 8)::numeric,
          'vat_rate', 19::numeric
        )
      ),
      ROUND((1500 + i * 450)::numeric, 2),
      ROUND((1500 + i * 450) * 0.19, 2),
      ROUND((1500 + i * 450) * 1.19, 2),
      'Angebot ' || i || ' - Gültigkeit 30 Tage. ' ||
      CASE
        WHEN i % 3 = 0 THEN 'Sonderkonditionen für Großauftrag.'
        WHEN i % 5 = 0 THEN 'Preise freibleibend und abhängig von Verfügbarkeit.'
        ELSE 'Alle Preise verstehen sich zzgl. MwSt.'
      END,
      v_user_id
    );
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 15 Angebote';
  RAISE NOTICE '';

  -- ============================================================================
  -- 12. KASSENBUCH-EINTRÄGE (40 Stück)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 40 Kassenbuch-Einträge...';

  v_receipt_ids := ARRAY[]::uuid[];

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
      CASE
        WHEN i % 5 = 0 THEN 'income'
        ELSE 'expense'
      END,
      CASE i % 8
        WHEN 0 THEN '4000' -- Einnahmen
        WHEN 1 THEN '6805' -- Porto
        WHEN 2 THEN '6670' -- Fahrtkosten
        WHEN 3 THEN '6644' -- Bewirtung
        WHEN 4 THEN '6300' -- Werbekosten
        WHEN 5 THEN '4910' -- Büromaterial
        WHEN 6 THEN '4930' -- Werkzeug
        ELSE '6200'        -- Raumkosten
      END,
      CASE
        WHEN i % 5 = 0 THEN 'Bareinnahme ' || i || ' - Kleinauftrag bezahlt'
        WHEN i % 8 = 1 THEN 'Porto und Versandkosten ' || i
        WHEN i % 8 = 2 THEN 'Tankquittung Fahrzeug ' || (i % 5 + 1)
        WHEN i % 8 = 3 THEN 'Kundenmeeting Restaurant ' || CHR(65 + (i % 10))
        WHEN i % 8 = 4 THEN 'Online-Werbung Kampagne ' || i
        WHEN i % 8 = 5 THEN 'Bürobedarf und Verbrauchsmaterial'
        WHEN i % 8 = 6 THEN 'Werkzeug und Kleingeräte'
        ELSE 'Miete Lagerhalle Monat ' || i
      END,
      ROUND((15 + (i * 23) % 800)::numeric, 2),
      CASE
        WHEN i % 4 = 0 THEN 0    -- Steuerfrei
        WHEN i % 4 = 1 THEN 7    -- Reduziert
        ELSE 19                   -- Normal
      END,
      ROUND(
        (15 + (i * 23) % 800) *
        CASE WHEN i % 4 = 0 THEN 0 WHEN i % 4 = 1 THEN 0.07 ELSE 0.19 END,
        2
      ),
      ROUND(
        (15 + (i * 23) % 800) /
        (1 + CASE WHEN i % 4 = 0 THEN 0 WHEN i % 4 = 1 THEN 0.07 ELSE 0.19 END),
        2
      ),
      'KB-REF-' || LPAD(i::TEXT, 5, '0'),
      5000 + (i * CASE WHEN i % 5 = 0 THEN 50 ELSE -30 END), -- Kassenstand
      MD5('entry_' || i::TEXT || '_' || v_tenant_id::TEXT),
      CASE WHEN i = 1 THEN '0' ELSE MD5('entry_' || (i-1)::TEXT || '_' || v_tenant_id::TEXT) END,
      v_user_id
    );
  END LOOP;

  RAISE NOTICE '   ✓ Erstellt: 40 Kassenbuch-Einträge';
  RAISE NOTICE '';

  -- ============================================================================
  -- 13. BELEGE/RECEIPTS (10 Stück mit Verknüpfung zum Kassenbuch)
  -- ============================================================================
  RAISE NOTICE '── Erstelle 10 Belege...';

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
      CASE i % 5
        WHEN 0 THEN 'Tankstelle Müller GmbH'
        WHEN 1 THEN 'Office Depot Deutschland'
        WHEN 2 THEN 'Restaurant Zur Post'
        WHEN 3 THEN 'Deutsche Post AG'
        ELSE 'Baumarkt Schmidt & Co'
      END,
      CASE i % 5
        WHEN 0 THEN 'fuel'
        WHEN 1 THEN 'office_supplies'
        WHEN 2 THEN 'meals'
        WHEN 3 THEN 'postage'
        ELSE 'materials'
      END,
      ROUND((25 + i * 37.5)::numeric, 2),
      CASE WHEN i % 3 = 0 THEN 7.00 ELSE 19.00 END,
      ROUND(
        (25 + i * 37.5) *
        CASE WHEN i % 3 = 0 THEN 0.07 ELSE 0.19 END,
        2
      ),
      'Beleg ' || i || ' - ' ||
      CASE i % 5
        WHEN 0 THEN 'Diesel Betankung Fahrzeug'
        WHEN 1 THEN 'Büromaterial und Druckerpapier'
        WHEN 2 THEN 'Geschäftsessen mit Kunde'
        WHEN 3 THEN 'Paketversand und Porto'
        ELSE 'Kleinwerkzeug und Schrauben'
      END,
      '/receipts/beleg_' || i || '_scan.pdf',
      v_user_id
    )
    RETURNING id INTO v_receipt_id;

    v_receipt_ids := array_append(v_receipt_ids, v_receipt_id);
  END LOOP;

  -- Verknüpfe einige Belege mit Kassenbuch-Einträgen
  UPDATE cashbook_entries
  SET receipt_id = v_receipt_ids[1]
  WHERE document_number = 'KB-' || LPAD('2'::TEXT, 6, '0');

  UPDATE cashbook_entries
  SET receipt_id = v_receipt_ids[2]
  WHERE document_number = 'KB-' || LPAD('5'::TEXT, 6, '0');

  UPDATE cashbook_entries
  SET receipt_id = v_receipt_ids[3]
  WHERE document_number = 'KB-' || LPAD('8'::TEXT, 6, '0');

  RAISE NOTICE '   ✓ Erstellt: 10 Belege (3 mit Kassenbuch verknüpft)';
  RAISE NOTICE '';

  -- ============================================================================
  -- ABSCHLUSS & STATISTIK
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║                    TESTDATEN ERFOLGREICH ERSTELLT                     ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIK:';
  RAISE NOTICE '   • Tenant ID: %', v_tenant_id;
  RAISE NOTICE '   • User ID: %', v_user_id;
  RAISE NOTICE '   • Kunden: 20';
  RAISE NOTICE '   • Artikel: 30';
  RAISE NOTICE '   • Lieferorte: 15';
  RAISE NOTICE '   • Kundenpreise: ~50';
  RAISE NOTICE '   • Lieferortpreise: ~20';
  RAISE NOTICE '   • Mengenstaffeln: ~30';
  RAISE NOTICE '   • Fahrzeuge: 5';
  RAISE NOTICE '   • Rechnungen: 30 (mit ~120 Positionen)';
  RAISE NOTICE '   • Lieferscheine: 25';
  RAISE NOTICE '   • Angebote: 15';
  RAISE NOTICE '   • Kassenbuch-Einträge: 40';
  RAISE NOTICE '   • Belege: 10';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Alle Daten sind vollständig miteinander verknüpft!';
  RAISE NOTICE '';

END $$;
