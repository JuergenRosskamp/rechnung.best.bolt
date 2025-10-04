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
BEGIN
  SELECT u.tenant_id, u.id INTO v_tenant_id, v_user_id
  FROM users u WHERE u.email = 'juergen.rosskamp@gmail.com' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User nicht gefunden';
  END IF;

  RAISE NOTICE 'Tenant: %, User: %', v_tenant_id, v_user_id;

  -- Kunden
  FOR i IN 1..20 LOOP
    INSERT INTO customers (tenant_id, customer_type, company_name, first_name, last_name, email, phone, address_line1, zip_code, city, country, payment_terms, discount_percentage)
    VALUES (v_tenant_id, CASE WHEN i <= 12 THEN 'b2b' WHEN i <= 18 THEN 'b2c' ELSE 'b2g' END, CASE WHEN i <= 12 THEN 'Firma ' || i || ' GmbH' ELSE NULL END,
    CASE WHEN i > 12 THEN 'Max' || i ELSE NULL END, CASE WHEN i > 12 THEN 'Mustermann' || i ELSE NULL END, 'kunde' || i || '@example.com',
    '+49 ' || (100 + i) || ' 123456' || i, 'Teststraße ' || i, LPAD((10000 + i * 100)::TEXT, 5, '0'),
    CASE i % 5 WHEN 0 THEN 'Berlin' WHEN 1 THEN 'Hamburg' WHEN 2 THEN 'München' WHEN 3 THEN 'Köln' ELSE 'Frankfurt' END,
    'Deutschland', CASE i % 3 WHEN 0 THEN '14 Tage' WHEN 1 THEN '30 Tage' ELSE 'Sofort' END, CASE i % 4 WHEN 0 THEN 5.0 WHEN 1 THEN 10.0 ELSE 0 END)
    RETURNING id INTO v_customer_id;
    v_customer_ids := array_append(v_customer_ids, v_customer_id);
  END LOOP;

  -- Artikel
  FOR i IN 1..25 LOOP
    INSERT INTO articles (tenant_id, name, category, unit, unit_price, vat_rate, cost_price, is_service, description)
    VALUES (v_tenant_id, CASE WHEN i <= 5 THEN 'Produkt Standard ' || i WHEN i <= 10 THEN 'Produkt Premium ' || (i-5) WHEN i <= 15 THEN 'Dienstleistung ' || (i-10) WHEN i <= 20 THEN 'Service Paket ' || (i-15) ELSE 'Sonderartikel ' || (i-20) END,
    CASE WHEN i <= 10 THEN 'Produkte' WHEN i <= 15 THEN 'Dienstleistungen' ELSE 'Services' END, CASE WHEN i <= 10 THEN 'Stück' WHEN i <= 15 THEN 'Stunde' WHEN i <= 20 THEN 'Paket' ELSE 'Set' END,
    CASE WHEN i <= 5 THEN 50 + i * 10 WHEN i <= 10 THEN 150 + i * 20 WHEN i <= 15 THEN 80 + i * 5 WHEN i <= 20 THEN 200 + i * 15 ELSE 500 + i * 50 END,
    CASE WHEN i % 3 = 0 THEN 7 ELSE 19 END, CASE WHEN i <= 10 THEN 30 + i * 5 ELSE NULL END, i > 10, 'Testbeschreibung für Artikel ' || i)
    RETURNING id INTO v_article_id;
    v_article_ids := array_append(v_article_ids, v_article_id);
  END LOOP;

  -- Fahrzeuge
  FOR i IN 1..5 LOOP
    INSERT INTO vehicles (tenant_id, license_plate, vehicle_type, brand, model, capacity_kg, capacity_m3, status, notes)
    VALUES (v_tenant_id, 'B-TE ' || (1000 + i), CASE WHEN i <= 2 THEN 'truck' WHEN i <= 4 THEN 'van' ELSE 'car' END,
    CASE i WHEN 1 THEN 'Mercedes' WHEN 2 THEN 'MAN' WHEN 3 THEN 'VW' WHEN 4 THEN 'Ford' ELSE 'BMW' END,
    CASE i WHEN 1 THEN 'Sprinter' WHEN 2 THEN 'TGX' WHEN 3 THEN 'Crafter' WHEN 4 THEN 'Transit' ELSE '320d' END,
    CASE WHEN i <= 2 THEN 5000 + i * 2000 ELSE 1000 + i * 500 END, CASE WHEN i <= 2 THEN 15 + i * 5 ELSE 3 + i END,
    CASE WHEN i % 2 = 0 THEN 'active' ELSE 'maintenance' END, 'Testfahrzeug ' || i)
    RETURNING id INTO v_vehicle_id;
    v_vehicle_ids := array_append(v_vehicle_ids, v_vehicle_id);
  END LOOP;

  RAISE NOTICE 'Erstellt: % Kunden, % Artikel, % Fahrzeuge', array_length(v_customer_ids, 1), array_length(v_article_ids, 1), array_length(v_vehicle_ids, 1);

END $$;
