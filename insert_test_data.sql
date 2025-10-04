-- Umfangreiche Testdaten für juergen.rosskamp@gmail.com

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_customer_ids UUID[];
  v_article_ids UUID[];
  v_vehicle_ids UUID[];
  v_invoice_ids UUID[];
  v_customer_id UUID;
  v_article_id UUID;
  v_vehicle_id UUID;
  v_invoice_id UUID;
  i INT;
  j INT;
  v_customer_number TEXT;
BEGIN
  SELECT u.tenant_id, u.id INTO v_tenant_id, v_user_id
  FROM users u WHERE u.email = 'juergen.rosskamp@gmail.com' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User nicht gefunden';
  END IF;

  RAISE NOTICE 'Erstelle Testdaten für Tenant: %, User: %', v_tenant_id, v_user_id;

  -- Kunden (20 Stück)
  RAISE NOTICE 'Erstelle 20 Kunden...';
  FOR i IN 1..20 LOOP
    v_customer_number := 'K-' || LPAD(i::TEXT, 5, '0');
    
    INSERT INTO customers (
      tenant_id, customer_number, customer_type, company_name, first_name, last_name, 
      email, phone, address_line1, zip_code, city, country, 
      default_payment_terms, discount_percentage
    )
    VALUES (
      v_tenant_id,
      v_customer_number,
      CASE WHEN i <= 12 THEN 'b2b' WHEN i <= 18 THEN 'b2c' ELSE 'b2g' END,
      CASE WHEN i <= 12 THEN 'Firma ' || i || ' GmbH' ELSE NULL END,
      CASE WHEN i > 12 THEN 'Max' || i ELSE NULL END,
      CASE WHEN i > 12 THEN 'Mustermann' || i ELSE NULL END,
      'kunde' || i || '@example.com',
      '+49 ' || (100 + i) || ' 123456' || i,
      'Teststraße ' || i,
      LPAD((10000 + i * 100)::TEXT, 5, '0'),
      CASE i % 5 WHEN 0 THEN 'Berlin' WHEN 1 THEN 'Hamburg' WHEN 2 THEN 'München' WHEN 3 THEN 'Köln' ELSE 'Frankfurt' END,
      'Deutschland',
      CASE i % 3 WHEN 0 THEN 'net_14' WHEN 1 THEN 'net_30' ELSE 'immediate' END,
      CASE i % 4 WHEN 0 THEN 5.0 WHEN 1 THEN 10.0 ELSE 0 END
    )
    RETURNING id INTO v_customer_id;
    v_customer_ids := array_append(v_customer_ids, v_customer_id);
  END LOOP;

  RAISE NOTICE 'Erstellt: % Kunden', array_length(v_customer_ids, 1);

  -- Artikel (25 Stück)
  RAISE NOTICE 'Erstelle 25 Artikel...';
  FOR i IN 1..25 LOOP
    INSERT INTO articles (
      tenant_id, name, category, unit, unit_price, vat_rate, 
      cost_price, is_service, description
    )
    VALUES (
      v_tenant_id,
      CASE 
        WHEN i <= 5 THEN 'Produkt Standard ' || i 
        WHEN i <= 10 THEN 'Produkt Premium ' || (i-5) 
        WHEN i <= 15 THEN 'Dienstleistung ' || (i-10) 
        WHEN i <= 20 THEN 'Service Paket ' || (i-15) 
        ELSE 'Sonderartikel ' || (i-20) 
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
      CASE WHEN i % 3 = 0 THEN 7 ELSE 19 END,
      CASE WHEN i <= 10 THEN 30 + i * 5 ELSE NULL END,
      i > 10,
      'Testbeschreibung für Artikel ' || i
    )
    RETURNING id INTO v_article_id;
    v_article_ids := array_append(v_article_ids, v_article_id);
  END LOOP;

  RAISE NOTICE 'Erstellt: % Artikel', array_length(v_article_ids, 1);

  -- Fahrzeuge (5 Stück)
  RAISE NOTICE 'Erstelle 5 Fahrzeuge...';
  FOR i IN 1..5 LOOP
    INSERT INTO vehicles (
      tenant_id, license_plate, vehicle_type, brand, model, 
      capacity_kg, capacity_m3, status, notes
    )
    VALUES (
      v_tenant_id,
      'B-TE ' || (1000 + i),
      CASE WHEN i <= 2 THEN 'truck' WHEN i <= 4 THEN 'van' ELSE 'car' END,
      CASE i WHEN 1 THEN 'Mercedes' WHEN 2 THEN 'MAN' WHEN 3 THEN 'VW' WHEN 4 THEN 'Ford' ELSE 'BMW' END,
      CASE i WHEN 1 THEN 'Sprinter' WHEN 2 THEN 'TGX' WHEN 3 THEN 'Crafter' WHEN 4 THEN 'Transit' ELSE '320d' END,
      CASE WHEN i <= 2 THEN 5000 + i * 2000 ELSE 1000 + i * 500 END,
      CASE WHEN i <= 2 THEN 15 + i * 5 ELSE 3 + i END,
      CASE WHEN i % 2 = 0 THEN 'active' ELSE 'maintenance' END,
      'Testfahrzeug ' || i
    )
    RETURNING id INTO v_vehicle_id;
    v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle_id);
  END LOOP;

  RAISE NOTICE 'Erstellt: % Fahrzeuge', array_length(v_vehicle_ids, 1);

  -- Rechnungen (30 Stück mit Positionen)
  RAISE NOTICE 'Erstelle 30 Rechnungen mit Positionen...';
  FOR i IN 1..30 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];

    INSERT INTO invoices (
      tenant_id, customer_id, invoice_number, invoice_date, due_date, 
      status, subtotal, vat_amount, total, notes, payment_terms, created_by
    )
    VALUES (
      v_tenant_id,
      v_customer_id,
      'RE-2024-' || LPAD(i::TEXT, 4, '0'),
      CURRENT_DATE - (i * 3),
      CURRENT_DATE - (i * 3) + INTERVAL '14 days',
      CASE i % 5 WHEN 0 THEN 'draft' WHEN 1 THEN 'sent' WHEN 2 THEN 'paid' WHEN 3 THEN 'overdue' ELSE 'cancelled' END,
      0, 0, 0,
      'Testrechnung ' || i,
      '14 Tage netto',
      v_user_id
    )
    RETURNING id INTO v_invoice_id;
    v_invoice_ids := array_append(v_invoice_ids, v_invoice_id);

    -- Positionen (1-5 pro Rechnung)
    FOR j IN 1..(1 + (i % 5)) LOOP
      v_article_id := v_article_ids[1 + (j % array_length(v_article_ids, 1))];

      INSERT INTO invoice_items (
        invoice_id, article_id, description, quantity, unit_price, 
        vat_rate, line_total, vat_amount
      )
      SELECT
        v_invoice_id,
        v_article_id,
        a.name,
        (1 + (j % 10)),
        a.unit_price,
        a.vat_rate,
        (1 + (j % 10)) * a.unit_price,
        ((1 + (j % 10)) * a.unit_price * a.vat_rate / 100)
      FROM articles a
      WHERE a.id = v_article_id;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Erstellt: % Rechnungen mit Positionen', array_length(v_invoice_ids, 1);

  -- Angebote (10 Stück)
  RAISE NOTICE 'Erstelle 10 Angebote...';
  FOR i IN 1..10 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];

    INSERT INTO quotes (
      tenant_id, customer_id, quote_number, quote_date, valid_until, 
      status, subtotal, vat_amount, total, notes, created_by
    )
    VALUES (
      v_tenant_id,
      v_customer_id,
      'ANG-2024-' || LPAD(i::TEXT, 4, '0'),
      CURRENT_DATE - (i * 2),
      CURRENT_DATE - (i * 2) + INTERVAL '30 days',
      CASE i % 4 WHEN 0 THEN 'draft' WHEN 1 THEN 'sent' WHEN 2 THEN 'accepted' ELSE 'declined' END,
      0, 0, 0,
      'Testangebot ' || i,
      v_user_id
    );
  END LOOP;

  RAISE NOTICE 'Erstellt: 10 Angebote';

  -- Kassenbuch-Einträge (40 Stück)
  RAISE NOTICE 'Erstelle 40 Kassenbuch-Einträge...';
  FOR i IN 1..40 LOOP
    INSERT INTO cashbook_entries (
      tenant_id, entry_date, document_type, category_id, description,
      amount, vat_rate, vat_amount, reference
    )
    VALUES (
      v_tenant_id,
      CURRENT_DATE - (i * 2),
      CASE WHEN i % 5 = 0 THEN 'income' ELSE 'expense' END,
      CASE i % 5 WHEN 0 THEN 'Büromaterial' WHEN 1 THEN 'Porto' WHEN 2 THEN 'Fahrtkosten' WHEN 3 THEN 'Bewirtung' ELSE 'Sonstige' END,
      'Kassenbuch Eintrag ' || i || ' - ' || CASE WHEN i % 5 = 0 THEN 'Einnahme' ELSE 'Ausgabe' END,
      (10 + (i * 13) % 500),
      CASE WHEN i % 3 = 0 THEN 7 ELSE 19 END,
      ((10 + (i * 13) % 500) * CASE WHEN i % 3 = 0 THEN 7 ELSE 19 END / 100),
      'KB-' || LPAD(i::TEXT, 4, '0')
    );
  END LOOP;

  RAISE NOTICE 'Erstellt: 40 Kassenbuch-Einträge';

  -- Lieferungen (15 Stück)
  RAISE NOTICE 'Erstelle 15 Lieferungen...';
  FOR i IN 1..15 LOOP
    v_vehicle_id := v_vehicle_ids[1 + (i % array_length(v_vehicle_ids, 1))];

    INSERT INTO deliveries (
      tenant_id, vehicle_id, delivery_date, status, notes
    )
    VALUES (
      v_tenant_id,
      v_vehicle_id,
      CURRENT_DATE - (i * 1.5)::INT,
      CASE i % 4 WHEN 0 THEN 'planned' WHEN 1 THEN 'in_progress' WHEN 2 THEN 'completed' ELSE 'cancelled' END,
      'Testlieferung ' || i
    );
  END LOOP;

  RAISE NOTICE 'Erstellt: 15 Lieferungen';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '        TESTDATEN ZUSAMMENFASSUNG       ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Kunden:              %', array_length(v_customer_ids, 1);
  RAISE NOTICE 'Artikel:             %', array_length(v_article_ids, 1);
  RAISE NOTICE 'Fahrzeuge:           %', array_length(v_vehicle_ids, 1);
  RAISE NOTICE 'Rechnungen:          %', array_length(v_invoice_ids, 1);
  RAISE NOTICE 'Angebote:            10';
  RAISE NOTICE 'Kassenbuch-Einträge: 40';
  RAISE NOTICE 'Lieferungen:         15';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Testdaten erfolgreich erstellt!';

END $$;
