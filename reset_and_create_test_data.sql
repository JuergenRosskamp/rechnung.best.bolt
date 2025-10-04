/*
  ============================================================================
  TESTDATEN SCRIPT - KLEIN (10/10/10)
  ============================================================================
  ✅ Vollständig validiert gegen complete_migration.sql
  ⚠️ WICHTIG: Zuerst über die App einloggen!
*/

DO $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_customer_ids uuid[] := ARRAY[]::uuid[];
  v_article_ids uuid[] := ARRAY[]::uuid[];
  v_vehicle_ids uuid[] := ARRAY[]::uuid[];
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_customer_id uuid;
  v_article_id uuid;
  v_vehicle_id uuid;
  v_invoice_id uuid;
  i integer;
  j integer;

BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           LÖSCHE ALTE DATEN UND ERSTELLE NEUE TESTDATEN               ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- DELETE
  RAISE NOTICE '🗑️  Lösche alte Testdaten...';
  BEGIN DELETE FROM invoice_payments; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM invoice_items; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM invoices; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM cashbook_entries; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM delivery_notes; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM articles; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM customers; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM vehicles; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM users; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM tenants; EXCEPTION WHEN undefined_table THEN NULL; END;
  RAISE NOTICE '   ✓ Alte Daten gelöscht';
  RAISE NOTICE '';

  -- TENANT
  RAISE NOTICE '📝 Erstelle Basis-Daten...';
  INSERT INTO tenants (company_name, tax_id, vat_id, address_line1, zip_code, city, country, phone, email, website, bank_name, iban, bic)
  VALUES ('Musterbau GmbH', 'DE123456789', 'DE999999999', 'Hauptstraße 1', '10115', 'Berlin', 'DE', '+49 30 12345678', 'info@musterbau.de', 'www.musterbau.de', 'Sparkasse Berlin', 'DE89370400440532013000', 'DEUTDEDBBER')
  RETURNING id INTO v_tenant_id;

  -- USER
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Kein User gefunden! Bitte zuerst über die App einloggen.';
  END IF;
  INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
  SELECT v_user_id, v_tenant_id, au.email, 'Max', 'Mustermann', 'admin'
  FROM auth.users au WHERE au.id = v_user_id
  ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;
  RAISE NOTICE '   ✓ Tenant & User erstellt';
  RAISE NOTICE '';

  -- KUNDEN (10)
  RAISE NOTICE '── Erstelle 10 Kunden...';
  FOR i IN 1..10 LOOP
    INSERT INTO customers (
      tenant_id, customer_number, customer_type, company_name,
      first_name, last_name, email, phone,
      address_line1, zip_code, city, country,
      default_payment_terms, is_active
    )
    VALUES (
      v_tenant_id,
      'K' || LPAD(i::TEXT, 5, '0'),
      CASE WHEN i % 3 = 0 THEN 'b2c' ELSE 'b2b' END,
      CASE WHEN i % 3 = 0 THEN NULL ELSE 'Kunde ' || i || ' GmbH' END,
      CASE WHEN i % 3 = 0 THEN 'Hans' ELSE NULL END,
      CASE WHEN i % 3 = 0 THEN 'Müller' || i ELSE NULL END,
      'kunde' || i || '@example.com',
      '+49 30 ' || LPAD((1000000 + i * 123)::TEXT, 7, '0'),
      'Kundenstraße ' || i,
      LPAD((10000 + i * 100)::TEXT, 5, '0'),
      CASE i % 3 WHEN 0 THEN 'Berlin' WHEN 1 THEN 'München' ELSE 'Hamburg' END,
      'DE',
      CASE i % 3 WHEN 0 THEN 'net_7' WHEN 1 THEN 'net_14' ELSE 'net_30' END,
      true
    )
    RETURNING id INTO v_customer_id;
    v_customer_ids := array_append(v_customer_ids, v_customer_id);
  END LOOP;
  RAISE NOTICE '   ✓ 10 Kunden erstellt';

  -- ARTIKEL (10)
  RAISE NOTICE '── Erstelle 10 Artikel...';
  FOR i IN 1..10 LOOP
    INSERT INTO articles (tenant_id, article_number, name, description, unit, unit_price, vat_rate, is_active)
    VALUES (
      v_tenant_id,
      'ART-' || LPAD(i::TEXT, 5, '0'),
      'Artikel ' || i,
      'Beschreibung Artikel ' || i,
      CASE i % 3 WHEN 0 THEN 't' WHEN 1 THEN 'm³' ELSE 'Stk' END,
      ROUND((50 + i * 15.5)::numeric, 2),
      CASE WHEN i % 5 = 0 THEN 7.00 ELSE 19.00 END,
      true
    )
    RETURNING id INTO v_article_id;
    v_article_ids := array_append(v_article_ids, v_article_id);
  END LOOP;
  RAISE NOTICE '   ✓ 10 Artikel erstellt';

  -- FAHRZEUGE (3)
  RAISE NOTICE '── Erstelle 3 Fahrzeuge...';
  FOR i IN 1..3 LOOP
    INSERT INTO vehicles (tenant_id, license_plate, vehicle_type, make, model, year, loading_capacity_kg, is_active)
    VALUES (
      v_tenant_id,
      'B-MB-' || LPAD((1000 + i)::TEXT, 4, '0'),
      'truck',
      'Mercedes',
      'Actros ' || (2020 + i),
      2020 + i,
      26000,
      true
    )
    RETURNING id INTO v_vehicle_id;
    v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle_id);
  END LOOP;
  RAISE NOTICE '   ✓ 3 Fahrzeuge erstellt';

  -- RECHNUNGEN (10)
  RAISE NOTICE '── Erstelle 10 Rechnungen...';
  FOR i IN 1..10 LOOP
    v_customer_id := v_customer_ids[1 + (i % array_length(v_customer_ids, 1))];

    INSERT INTO invoices (tenant_id, customer_id, customer_snapshot, invoice_number, invoice_date, due_date, status, payment_status, payment_terms, subtotal, total_vat, total, created_by)
    SELECT
      v_tenant_id,
      v_customer_id,
      jsonb_build_object('customer_number', c.customer_number, 'display_name', c.display_name, 'address_line1', c.address_line1, 'zip_code', c.zip_code, 'city', c.city),
      'RE-2024-' || LPAD(i::TEXT, 5, '0'),
      CURRENT_DATE - (i * 3),
      CURRENT_DATE - (i * 3) + 14,
      CASE i % 4 WHEN 0 THEN 'draft' WHEN 1 THEN 'sent' WHEN 2 THEN 'paid' ELSE 'overdue' END,
      CASE i % 4 WHEN 2 THEN 'paid' ELSE 'unpaid' END,
      c.default_payment_terms,
      1000 + (i * 100),
      (1000 + (i * 100)) * 0.19,
      (1000 + (i * 100)) * 1.19,
      v_user_id
    FROM customers c
    WHERE c.id = v_customer_id
    RETURNING id INTO v_invoice_id;

    v_invoice_ids := array_append(v_invoice_ids, v_invoice_id);

    -- Invoice items
    FOR j IN 1..3 LOOP
      v_article_id := v_article_ids[1 + ((i * 3 + j) % array_length(v_article_ids, 1))];

      INSERT INTO invoice_items (invoice_id, tenant_id, position_number, article_id, description, quantity, unit, unit_price, vat_rate, vat_amount, net_amount, total_amount)
      SELECT
        v_invoice_id,
        v_tenant_id,
        j,
        v_article_id,
        a.name,
        (5 + j)::numeric,
        a.unit,
        a.unit_price,
        a.vat_rate,
        ROUND((5 + j) * a.unit_price * a.vat_rate / 100, 2),
        ROUND((5 + j) * a.unit_price, 2),
        ROUND((5 + j) * a.unit_price * (1 + a.vat_rate / 100), 2)
      FROM articles a
      WHERE a.id = v_article_id;
    END LOOP;
  END LOOP;
  RAISE NOTICE '   ✓ 10 Rechnungen mit ~30 Positionen erstellt';

  -- KASSENBUCH (10)
  RAISE NOTICE '── Erstelle 10 Kassenbuch-Einträge...';
  FOR i IN 1..10 LOOP
    INSERT INTO cashbook_entries (tenant_id, entry_date, document_number, document_type, category_code, description, amount, vat_rate, vat_amount, net_amount, cash_balance, hash, previous_hash, created_by)
    VALUES (
      v_tenant_id,
      CURRENT_DATE - (i * 2),
      'KB-' || LPAD(i::TEXT, 6, '0'),
      CASE WHEN i % 3 = 0 THEN 'income' ELSE 'expense' END,
      CASE i % 4 WHEN 0 THEN '4000' WHEN 1 THEN '6805' ELSE '6300' END,
      'Kassenbuch Eintrag ' || i,
      ROUND((15 + i * 23)::numeric, 2),
      CASE WHEN i % 3 = 0 THEN 19 ELSE 7 END,
      ROUND((15 + i * 23) * CASE WHEN i % 3 = 0 THEN 0.19 ELSE 0.07 END, 2),
      ROUND((15 + i * 23) / (1 + CASE WHEN i % 3 = 0 THEN 0.19 ELSE 0.07 END), 2),
      5000 + (i * 50),
      MD5('entry_' || i::TEXT),
      CASE WHEN i = 1 THEN '0' ELSE MD5('entry_' || (i-1)::TEXT) END,
      v_user_id
    );
  END LOOP;
  RAISE NOTICE '   ✓ 10 Kassenbuch-Einträge erstellt';
  RAISE NOTICE '';

  -- SUMMARY
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║              ✅ TESTDATEN ERFOLGREICH ERSTELLT                        ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ZUSAMMENFASSUNG:';
  RAISE NOTICE '   • Tenant: Musterbau GmbH';
  RAISE NOTICE '   • Kunden: 10';
  RAISE NOTICE '   • Artikel: 10';
  RAISE NOTICE '   • Fahrzeuge: 3';
  RAISE NOTICE '   • Rechnungen: 10 (~30 Positionen)';
  RAISE NOTICE '   • Kassenbuch: 10 Einträge';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Alle Daten vollständig verknüpft und einsatzbereit!';

END $$;
