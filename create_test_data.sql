-- Comprehensive test data for juergen.rosskamp@gmail.com
-- Tenant ID: b50a4858-b1d6-425c-a97f-dfd476ff8ebf

DO $$
DECLARE
  v_tenant_id uuid := 'b50a4858-b1d6-425c-a97f-dfd476ff8ebf';
  v_customer_ids uuid[] := '{}';
  v_article_ids uuid[] := '{}';
  v_customer_id uuid;
  v_article_id uuid;
  v_invoice_id uuid;
  i int;
BEGIN
  -- Create 15 test customers
  FOR i IN 1..15 LOOP
    INSERT INTO customers (
      tenant_id, customer_number, company_name, first_name, last_name,
      email, phone, address_line1, zip_code, city, country,
      customer_type, default_payment_terms, discount_percentage, is_active
    ) VALUES (
      v_tenant_id,
      'K' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 3 != 0 THEN
        CASE i
          WHEN 1 THEN 'Müller & Partner GmbH' WHEN 2 THEN 'Schmidt IT Solutions'
          WHEN 4 THEN 'Weber Consulting' WHEN 5 THEN 'Fischer Industries AG'
          WHEN 7 THEN 'Becker Services GmbH' WHEN 8 THEN 'Schulz & Co. KG'
          WHEN 10 THEN 'Wagner Automobile' WHEN 11 THEN 'Hoffmann Engineering'
          WHEN 13 THEN 'Koch Logistik GmbH' WHEN 14 THEN 'Bauer Immobilien'
          ELSE NULL
        END
      ELSE NULL END,
      CASE WHEN i % 3 = 0 THEN
        CASE i WHEN 3 THEN 'Thomas' WHEN 6 THEN 'Sarah' WHEN 9 THEN 'Michael' WHEN 12 THEN 'Julia' WHEN 15 THEN 'Alexander' ELSE 'Max' END
      ELSE NULL END,
      CASE WHEN i % 3 = 0 THEN
        CASE i WHEN 3 THEN 'Meyer' WHEN 6 THEN 'Schneider' WHEN 9 THEN 'Klein' WHEN 12 THEN 'Wolf' WHEN 15 THEN 'Neumann' ELSE 'Mustermann' END
      ELSE NULL END,
      'kunde' || i || '@beispiel.de',
      '+49 30 ' || (10000000 + i * 123456),
      CASE i % 5 WHEN 0 THEN 'Hauptstraße ' || (i * 10) WHEN 1 THEN 'Bahnhofstraße ' || (i * 5) WHEN 2 THEN 'Gartenweg ' || i WHEN 3 THEN 'Berliner Allee ' || (i * 3) ELSE 'Musterstraße ' || (i * 7) END,
      CASE i % 4 WHEN 0 THEN '10115' WHEN 1 THEN '80331' WHEN 2 THEN '20095' ELSE '50667' END,
      CASE i % 4 WHEN 0 THEN 'Berlin' WHEN 1 THEN 'München' WHEN 2 THEN 'Hamburg' ELSE 'Köln' END,
      'DE',
      CASE WHEN i % 3 = 0 THEN 'b2c' ELSE 'b2b' END,
      CASE i % 4 WHEN 0 THEN 'net_30' WHEN 1 THEN 'net_14' WHEN 2 THEN 'net_7' ELSE 'immediately' END,
      CASE WHEN i % 7 = 0 THEN 5 ELSE 0 END,
      i % 7 != 0
    ) RETURNING id INTO v_customer_id;
    v_customer_ids := array_append(v_customer_ids, v_customer_id);
  END LOOP;

  -- Create 20 test articles
  FOR i IN 1..20 LOOP
    INSERT INTO articles (
      tenant_id, article_number, name, description, category, unit, unit_price, vat_rate, is_service, is_active
    ) VALUES (
      v_tenant_id,
      'A' || LPAD(i::text, 5, '0'),
      CASE i
        WHEN 1 THEN 'Beratungsstunde Senior' WHEN 2 THEN 'Beratungsstunde Junior' WHEN 3 THEN 'Projektmanagement Tag' WHEN 4 THEN 'Entwicklungsstunde'
        WHEN 5 THEN 'Design Stunde' WHEN 6 THEN 'Schulung pro Tag' WHEN 7 THEN 'Support Paket Premium' WHEN 8 THEN 'Support Paket Standard'
        WHEN 9 THEN 'Lizenz Jahresgebühr' WHEN 10 THEN 'Server Hosting Monat' WHEN 11 THEN 'SEO Optimierung' WHEN 12 THEN 'Content Erstellung'
        WHEN 13 THEN 'Telefon Support Stunde' WHEN 14 THEN 'On-Site Support Tag' WHEN 15 THEN 'Wartungsvertrag Monat' WHEN 16 THEN 'Backup Service Monat'
        WHEN 17 THEN 'Cloud Storage 100GB' WHEN 18 THEN 'SSL Zertifikat Jahr' WHEN 19 THEN 'Domain Registrierung' WHEN 20 THEN 'E-Mail Hosting'
      END,
      'Professionelle Dienstleistung mit Qualitätsgarantie',
      CASE i % 5 WHEN 0 THEN 'Consulting' WHEN 1 THEN 'Entwicklung' WHEN 2 THEN 'Support' WHEN 3 THEN 'Hosting' ELSE 'Sonstiges' END,
      CASE i % 6 WHEN 0 THEN 'hours' WHEN 1 THEN 'days' WHEN 2 THEN 'pcs' WHEN 3 THEN 'months' ELSE 'hours' END,
      CASE i WHEN 1 THEN 150 WHEN 2 THEN 85 WHEN 3 THEN 950 WHEN 4 THEN 95 WHEN 5 THEN 110 WHEN 6 THEN 850 WHEN 7 THEN 299 WHEN 8 THEN 149 WHEN 9 THEN 1200 WHEN 10 THEN 45 WHEN 11 THEN 750 WHEN 12 THEN 120 WHEN 13 THEN 75 WHEN 14 THEN 800 WHEN 15 THEN 199 WHEN 16 THEN 49 WHEN 17 THEN 15 WHEN 18 THEN 89 WHEN 19 THEN 12 WHEN 20 THEN 5 END,
      CASE i % 3 WHEN 0 THEN 7 ELSE 19 END,
      i <= 14,
      i % 8 != 0
    ) RETURNING id INTO v_article_id;
    v_article_ids := array_append(v_article_ids, v_article_id);
  END LOOP;

  -- Create 25 invoices
  FOR i IN 1..25 LOOP
    v_customer_id := v_customer_ids[1 + floor(random() * array_length(v_customer_ids, 1))::int];
    
    INSERT INTO invoices (tenant_id, invoice_number, invoice_date, due_date, customer_id, customer_snapshot, default_payment_terms, status, payment_status, subtotal, total_vat, total, amount_paid)
    SELECT v_tenant_id, 'RE-2025-' || LPAD(i::text, 4, '0'), CURRENT_DATE - (random() * 90)::int, CURRENT_DATE - (random() * 90)::int + 30, c.id, row_to_json(c.*),'net_30',
      CASE (random() * 5)::int WHEN 0 THEN 'draft' WHEN 1 THEN 'sent' WHEN 2 THEN 'paid' WHEN 3 THEN 'overdue' ELSE 'sent' END,
      CASE (random() * 3)::int WHEN 0 THEN 'unpaid' WHEN 1 THEN 'paid' ELSE 'unpaid' END, 0, 0, 0, 0
    FROM customers c WHERE c.id = v_customer_id
    RETURNING id INTO v_invoice_id;

    -- Add 2-5 items per invoice
    FOR j IN 1..(2 + floor(random() * 4)::int) LOOP
      v_article_id := v_article_ids[1 + floor(random() * array_length(v_article_ids, 1))::int];
      INSERT INTO invoice_items (invoice_id, tenant_id, position_number, description, quantity, unit, unit_price, vat_rate, discount_percentage, discount_amount, vat_amount, net_amount, total_amount, article_id)
      SELECT v_invoice_id, v_tenant_id, j, a.name, (1 + floor(random() * 10)::int)::numeric, a.unit, a.unit_price, a.vat_rate, 0, 0,
        (a.unit_price * (1 + floor(random() * 10)::int) * a.vat_rate / 100)::numeric(15,2),
        (a.unit_price * (1 + floor(random() * 10)::int))::numeric(15,2),
        (a.unit_price * (1 + floor(random() * 10)::int) * (1 + a.vat_rate / 100))::numeric(15,2), a.id
      FROM articles a WHERE a.id = v_article_id;
    END LOOP;
  END LOOP;

  -- Update totals
  UPDATE invoices i SET subtotal = (SELECT COALESCE(SUM(net_amount), 0) FROM invoice_items WHERE invoice_id = i.id),
    total_vat = (SELECT COALESCE(SUM(vat_amount), 0) FROM invoice_items WHERE invoice_id = i.id),
    total = (SELECT COALESCE(SUM(total_amount), 0) FROM invoice_items WHERE invoice_id = i.id),
    amount_paid = CASE WHEN i.status = 'paid' THEN (SELECT COALESCE(SUM(total_amount), 0) FROM invoice_items WHERE invoice_id = i.id) ELSE 0 END
  WHERE i.tenant_id = v_tenant_id;

  -- Add payments
  INSERT INTO invoice_payments (invoice_id, tenant_id, amount, payment_date, payment_method)
  SELECT i.id, i.tenant_id, i.total, i.invoice_date + (5 + floor(random() * 20)::int), 'bank_transfer'
  FROM invoices i WHERE i.tenant_id = v_tenant_id AND i.status = 'paid';

  -- Update statistics
  UPDATE customers c SET
    total_revenue = (SELECT COALESCE(SUM(i.total), 0) FROM invoices i WHERE i.customer_id = c.id AND i.status IN ('paid', 'partially_paid')),
    invoice_count = (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id),
    last_invoice_date = (SELECT MAX(i.invoice_date) FROM invoices i WHERE i.customer_id = c.id)
  WHERE c.tenant_id = v_tenant_id;

  UPDATE articles a SET
    times_sold = (SELECT COALESCE(SUM(ii.quantity)::int, 0) FROM invoice_items ii WHERE ii.article_id = a.id),
    total_revenue = (SELECT COALESCE(SUM(ii.total_amount), 0) FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id WHERE ii.article_id = a.id AND i.status IN ('paid', 'partially_paid'))
  WHERE a.tenant_id = v_tenant_id;

  INSERT INTO invoice_numbering (tenant_id, series_name, prefix, current_number, year, reset_yearly)
  VALUES (v_tenant_id, 'default', 'RE', 25, EXTRACT(YEAR FROM CURRENT_DATE)::int, true);

  RAISE NOTICE 'Test data created: 15 customers, 20 articles, 25 invoices';
END $$;
