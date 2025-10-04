-- ============================================================================
-- RECHNUNG.BEST - TEST DATA FOR juergen.rosskamp@gmail.com
-- ============================================================================
-- Apply this AFTER running SETUP_DATABASE.sql
-- This creates realistic test data for immediate use
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Tenant and User
-- ============================================================================

-- First, you need to manually create the auth user in Supabase:
-- Go to Authentication > Users > Add User
-- Email: juergen.rosskamp@gmail.com
-- Password: (choose a secure password)
-- Auto Confirm: Yes

-- After creating the auth user, get the user ID and replace YOUR_AUTH_USER_ID below

DO $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid := '6a053515-108d-4826-946d-577f1767e36f'; -- juergen.rosskamp@gmail.com
  v_subscription_id uuid;

  -- Customer IDs
  v_customer_1 uuid;
  v_customer_2 uuid;
  v_customer_3 uuid;
  v_customer_4 uuid;
  v_customer_5 uuid;

  -- Article IDs
  v_article_1 uuid;
  v_article_2 uuid;
  v_article_3 uuid;
  v_article_4 uuid;
  v_article_5 uuid;

  -- Vehicle IDs
  v_vehicle_1 uuid;
  v_vehicle_2 uuid;

  -- Invoice IDs
  v_invoice_1 uuid;
  v_invoice_2 uuid;
  v_invoice_3 uuid;

  -- Delivery IDs
  v_delivery_1 uuid;
  v_delivery_2 uuid;

BEGIN
  RAISE NOTICE 'Creating test data for juergen.rosskamp@gmail.com...';

  -- ============================================================================
  -- Create Tenant
  -- ============================================================================

  INSERT INTO tenants (
    company_name,
    address_line1,
    address_line2,
    zip_code,
    city,
    country,
    tax_id,
    vat_id,
    bank_name,
    bank_account_holder,
    iban,
    bic
  ) VALUES (
    'Rosskamp Logistik GmbH',
    'Hauptstraße 123',
    NULL,
    '10115',
    'Berlin',
    'DE',
    'DE123456789',
    'DE123456789',
    'Deutsche Bank',
    'Rosskamp Logistik GmbH',
    'DE89370400440532013000',
    'COBADEFFXXX'
  ) RETURNING id INTO v_tenant_id;

  RAISE NOTICE 'Created tenant: %', v_tenant_id;

  -- ============================================================================
  -- Create User Profile
  -- ============================================================================

  INSERT INTO users (
    id,
    tenant_id,
    email,
    role,
    first_name,
    last_name
  ) VALUES (
    v_user_id,
    v_tenant_id,
    'juergen.rosskamp@gmail.com',
    'admin',
    'Jürgen',
    'Rosskamp'
  );

  RAISE NOTICE 'Created user profile';

  -- ============================================================================
  -- Create Subscription
  -- ============================================================================

  INSERT INTO subscriptions (
    tenant_id,
    plan_type,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) VALUES (
    v_tenant_id,
    'rechnung.best',
    'active',
    now() + interval '30 days',
    now(),
    now() + interval '1 year'
  ) RETURNING id INTO v_subscription_id;

  RAISE NOTICE 'Created subscription';

  -- ============================================================================
  -- Create Customers
  -- ============================================================================

  -- Customer 1: Müller Baumarkt
  INSERT INTO customers (
    tenant_id,
    customer_number,
    company_name,
    first_name,
    last_name,
    email,
    phone,
    address_line1,
    zip_code,
    city,
    country,
    payment_terms_days,
    early_payment_discount_percent,
    early_payment_discount_days,
    is_active
  ) VALUES (
    v_tenant_id,
    'K-10001',
    'Müller Baumarkt GmbH',
    'Thomas',
    'Müller',
    'thomas.mueller@baumarkt.de',
    '+49 30 12345678',
    'Baumarktstraße 45',
    '10115',
    'Berlin',
    'DE',
    14,
    2.0,
    7,
    true
  ) RETURNING id INTO v_customer_1;

  -- Customer 2: Schmidt Handels AG
  INSERT INTO customers (
    tenant_id,
    customer_number,
    company_name,
    first_name,
    last_name,
    email,
    phone,
    address_line1,
    zip_code,
    city,
    country,
    payment_terms_days,
    early_payment_discount_percent,
    early_payment_discount_days,
    is_active
  ) VALUES (
    v_tenant_id,
    'K-10002',
    'Schmidt Handels AG',
    'Anna',
    'Schmidt',
    'a.schmidt@handel.de',
    '+49 30 98765432',
    'Handelsweg 12',
    '10178',
    'Berlin',
    'DE',
    30,
    3.0,
    10,
    true
  ) RETURNING id INTO v_customer_2;

  -- Customer 3: Weber Großhandel
  INSERT INTO customers (
    tenant_id,
    customer_number,
    company_name,
    first_name,
    last_name,
    email,
    phone,
    address_line1,
    zip_code,
    city,
    country,
    payment_terms_days,
    early_payment_discount_percent,
    early_payment_discount_days,
    is_active
  ) VALUES (
    v_tenant_id,
    'K-10003',
    'Weber Großhandel',
    'Michael',
    'Weber',
    'm.weber@grosshandel.de',
    '+49 30 55555555',
    'Großhandelsplatz 8',
    '10243',
    'Berlin',
    'DE',
    14,
    0,
    0,
    true
  ) RETURNING id INTO v_customer_3;

  -- Customer 4: Fischer Logistik
  INSERT INTO customers (
    tenant_id,
    customer_number,
    company_name,
    first_name,
    last_name,
    email,
    phone,
    address_line1,
    zip_code,
    city,
    country,
    payment_terms_days,
    early_payment_discount_percent,
    early_payment_discount_days,
    is_active
  ) VALUES (
    v_tenant_id,
    'K-10004',
    'Fischer Logistik GmbH',
    'Sarah',
    'Fischer',
    's.fischer@logistik.de',
    '+49 30 77777777',
    'Logistikstraße 23',
    '10315',
    'Berlin',
    'DE',
    21,
    2.0,
    7,
    true
  ) RETURNING id INTO v_customer_4;

  -- Customer 5: Becker Handel
  INSERT INTO customers (
    tenant_id,
    customer_number,
    company_name,
    first_name,
    last_name,
    email,
    phone,
    address_line1,
    zip_code,
    city,
    country,
    payment_terms_days,
    early_payment_discount_percent,
    early_payment_discount_days,
    is_active
  ) VALUES (
    v_tenant_id,
    'K-10005',
    'Becker Handel e.K.',
    'Martin',
    'Becker',
    'm.becker@handel.com',
    '+49 30 88888888',
    'Handelsallee 56',
    '10407',
    'Berlin',
    'DE',
    30,
    3.0,
    14,
    true
  ) RETURNING id INTO v_customer_5;

  RAISE NOTICE 'Created 5 customers';

  -- ============================================================================
  -- Create Delivery Locations
  -- ============================================================================

  -- Delivery location for Müller Baumarkt
  INSERT INTO delivery_locations (
    customer_id,
    location_name,
    address_line1,
    zip_code,
    city,
    country,
    contact_person,
    contact_phone,
    delivery_notes
  ) VALUES (
    v_customer_1,
    'Hauptlager',
    'Lagerstraße 100',
    '10115',
    'Berlin',
    'DE',
    'Hans Müller',
    '+49 30 12345679',
    'Anlieferung nur Mo-Fr 8-16 Uhr'
  );

  -- Delivery location for Schmidt Handels AG
  INSERT INTO delivery_locations (
    customer_id,
    location_name,
    address_line1,
    zip_code,
    city,
    country,
    contact_person,
    contact_phone,
    delivery_notes
  ) VALUES (
    v_customer_2,
    'Filiale Nord',
    'Nordstraße 45',
    '13347',
    'Berlin',
    'DE',
    'Peter Schmidt',
    '+49 30 98765433',
    'Bitte am Hintereingang klingeln'
  );

  RAISE NOTICE 'Created delivery locations';

  -- ============================================================================
  -- Create Articles
  -- ============================================================================

  -- Article 1: Palette Beton
  INSERT INTO articles (
    tenant_id,
    article_number,
    name,
    description,
    unit,
    unit_price,
    tax_rate,
    category,
    is_active
  ) VALUES (
    v_tenant_id,
    'ART-1001',
    'Palette Beton (1 Tonne)',
    'Hochwertiger Beton für Bauprojekte',
    'Palette',
    450.00,
    19.00,
    'Baustoffe',
    true
  ) RETURNING id INTO v_article_1;

  -- Article 2: Kies
  INSERT INTO articles (
    tenant_id,
    article_number,
    name,
    description,
    unit,
    unit_price,
    tax_rate,
    category,
    is_active
  ) VALUES (
    v_tenant_id,
    'ART-1002',
    'Kies (Tonne)',
    'Naturkies 16/32mm',
    'Tonne',
    85.00,
    19.00,
    'Baustoffe',
    true
  ) RETURNING id INTO v_article_2;

  -- Article 3: Sand
  INSERT INTO articles (
    tenant_id,
    article_number,
    name,
    description,
    unit,
    unit_price,
    tax_rate,
    category,
    is_active
  ) VALUES (
    v_tenant_id,
    'ART-1003',
    'Sand (Tonne)',
    'Bausand 0/2mm',
    'Tonne',
    65.00,
    19.00,
    'Baustoffe',
    true
  ) RETURNING id INTO v_article_3;

  -- Article 4: Transport
  INSERT INTO articles (
    tenant_id,
    article_number,
    name,
    description,
    unit,
    unit_price,
    tax_rate,
    category,
    is_active
  ) VALUES (
    v_tenant_id,
    'ART-2001',
    'Lieferung Standard',
    'Standardlieferung innerhalb Berlin',
    'Stück',
    120.00,
    19.00,
    'Dienstleistung',
    true
  ) RETURNING id INTO v_article_4;

  -- Article 5: Express Transport
  INSERT INTO articles (
    tenant_id,
    article_number,
    name,
    description,
    unit,
    unit_price,
    tax_rate,
    category,
    is_active
  ) VALUES (
    v_tenant_id,
    'ART-2002',
    'Expresslieferung',
    'Expresslieferung innerhalb 24h',
    'Stück',
    250.00,
    19.00,
    'Dienstleistung',
    true
  ) RETURNING id INTO v_article_5;

  RAISE NOTICE 'Created 5 articles';

  -- ============================================================================
  -- Create Volume Discounts
  -- ============================================================================

  -- Volume discount for Beton
  INSERT INTO article_volume_discounts (article_id, min_quantity, discount_percentage)
  VALUES (v_article_1, 5, 5.0);

  INSERT INTO article_volume_discounts (article_id, min_quantity, discount_percentage)
  VALUES (v_article_1, 10, 10.0);

  -- Volume discount for Kies
  INSERT INTO article_volume_discounts (article_id, min_quantity, discount_percentage)
  VALUES (v_article_2, 10, 5.0);

  RAISE NOTICE 'Created volume discounts';

  -- ============================================================================
  -- Create Vehicles
  -- ============================================================================

  -- Vehicle 1: Main truck
  INSERT INTO vehicles (
    tenant_id,
    license_plate,
    vehicle_type,
    make,
    model,
    capacity,
    is_active,
    notes
  ) VALUES (
    v_tenant_id,
    'B-RK 1234',
    'LKW',
    'Mercedes-Benz',
    'Actros 1840',
    18000.00,
    true,
    'Hauptfahrzeug für schwere Lasten'
  ) RETURNING id INTO v_vehicle_1;

  -- Vehicle 2: Delivery van
  INSERT INTO vehicles (
    tenant_id,
    license_plate,
    vehicle_type,
    make,
    model,
    capacity,
    is_active,
    notes
  ) VALUES (
    v_tenant_id,
    'B-RK 5678',
    'Transporter',
    'Mercedes-Benz',
    'Sprinter 316',
    3500.00,
    true,
    'Für kleinere Lieferungen'
  ) RETURNING id INTO v_vehicle_2;

  RAISE NOTICE 'Created 2 vehicles';

  -- ============================================================================
  -- Create Invoices with Items
  -- ============================================================================

  -- Invoice 1: Completed and paid
  INSERT INTO invoices (
    tenant_id,
    customer_id,
    invoice_type,
    invoice_number,
    invoice_date,
    due_date,
    status,
    net_amount,
    tax_amount,
    total_amount,
    notes
  ) VALUES (
    v_tenant_id,
    v_customer_1,
    'invoice',
    'RE2025-00001',
    CURRENT_DATE - interval '15 days',
    CURRENT_DATE - interval '1 day',
    'paid',
    0, -- will be updated by trigger
    0,
    0,
    'Lieferung wie vereinbart'
  ) RETURNING id INTO v_invoice_1;

  -- Invoice 1 items
  INSERT INTO invoice_items (
    invoice_id, article_id, position, description, quantity, unit, unit_price, discount_percentage, tax_rate, line_total
  ) VALUES (
    v_invoice_1, v_article_1, 1, 'Palette Beton (1 Tonne)', 5, 'Palette', 450.00, 5.0, 19.00, 2137.50
  );

  INSERT INTO invoice_items (
    invoice_id, article_id, position, description, quantity, unit, unit_price, discount_percentage, tax_rate, line_total
  ) VALUES (
    v_invoice_1, v_article_4, 2, 'Lieferung Standard', 1, 'Stück', 120.00, 0, 19.00, 120.00
  );

  -- Invoice 2: Sent, awaiting payment
  INSERT INTO invoices (
    tenant_id,
    customer_id,
    invoice_type,
    invoice_number,
    invoice_date,
    due_date,
    status,
    net_amount,
    tax_amount,
    total_amount,
    early_payment_discount_percentage,
    early_payment_discount_days,
    notes
  ) VALUES (
    v_tenant_id,
    v_customer_2,
    'invoice',
    'RE2025-00002',
    CURRENT_DATE - interval '5 days',
    CURRENT_DATE + interval '9 days',
    'sent',
    0,
    0,
    0,
    2.0,
    7,
    '2% Skonto bei Zahlung innerhalb 7 Tagen'
  ) RETURNING id INTO v_invoice_2;

  -- Invoice 2 items
  INSERT INTO invoice_items (
    invoice_id, article_id, position, description, quantity, unit, unit_price, discount_percentage, tax_rate, line_total
  ) VALUES (
    v_invoice_2, v_article_2, 1, 'Kies (Tonne)', 15, 'Tonne', 85.00, 5.0, 19.00, 1210.63
  );

  INSERT INTO invoice_items (
    invoice_id, article_id, position, description, quantity, unit, unit_price, discount_percentage, tax_rate, line_total
  ) VALUES (
    v_invoice_2, v_article_3, 2, 'Sand (Tonne)', 8, 'Tonne', 65.00, 0, 19.00, 520.00
  );

  INSERT INTO invoice_items (
    invoice_id, article_id, position, description, quantity, unit, unit_price, discount_percentage, tax_rate, line_total
  ) VALUES (
    v_invoice_2, v_article_5, 3, 'Expresslieferung', 1, 'Stück', 250.00, 0, 19.00, 250.00
  );

  -- Invoice 3: Draft
  INSERT INTO invoices (
    tenant_id,
    customer_id,
    invoice_type,
    invoice_number,
    invoice_date,
    due_date,
    status,
    net_amount,
    tax_amount,
    total_amount,
    notes
  ) VALUES (
    v_tenant_id,
    v_customer_3,
    'invoice',
    NULL, -- draft, no number yet
    CURRENT_DATE,
    CURRENT_DATE + interval '14 days',
    'draft',
    0,
    0,
    0,
    'Entwurf - noch nicht versendet'
  ) RETURNING id INTO v_invoice_3;

  -- Invoice 3 items
  INSERT INTO invoice_items (
    invoice_id, article_id, position, description, quantity, unit, unit_price, discount_percentage, tax_rate, line_total
  ) VALUES (
    v_invoice_3, v_article_1, 1, 'Palette Beton (1 Tonne)', 10, 'Palette', 450.00, 10.0, 19.00, 4050.00
  );

  RAISE NOTICE 'Created 3 invoices with items';

  -- ============================================================================
  -- Create Invoice Payment
  -- ============================================================================

  INSERT INTO invoice_payments (
    invoice_id,
    payment_date,
    amount,
    payment_method,
    reference,
    notes
  ) VALUES (
    v_invoice_1,
    CURRENT_DATE - interval '3 days',
    2686.42,
    'bank_transfer',
    'Überweisung 15.01.2025',
    'Rechnung vollständig beglichen'
  );

  RAISE NOTICE 'Created invoice payment';

  -- ============================================================================
  -- Create Deliveries
  -- ============================================================================

  -- Delivery 1: Completed
  INSERT INTO deliveries (
    tenant_id,
    customer_id,
    vehicle_id,
    delivery_number,
    delivery_date,
    status,
    driver_name,
    notes
  ) VALUES (
    v_tenant_id,
    v_customer_1,
    v_vehicle_1,
    'LF-2025-001',
    CURRENT_DATE - interval '15 days',
    'completed',
    'Hans Meyer',
    'Lieferung erfolgreich abgeschlossen'
  ) RETURNING id INTO v_delivery_1;

  -- Delivery 1 items
  INSERT INTO delivery_items (delivery_id, article_id, quantity, unit, notes)
  VALUES (v_delivery_1, v_article_1, 5, 'Palette', 'Alle Paletten in gutem Zustand');

  -- Delivery 2: Planned
  INSERT INTO deliveries (
    tenant_id,
    customer_id,
    vehicle_id,
    delivery_number,
    delivery_date,
    status,
    driver_name,
    notes
  ) VALUES (
    v_tenant_id,
    v_customer_2,
    v_vehicle_2,
    'LF-2025-002',
    CURRENT_DATE + interval '2 days',
    'planned',
    'Klaus Schmidt',
    'Expresslieferung - vor 10 Uhr'
  ) RETURNING id INTO v_delivery_2;

  -- Delivery 2 items
  INSERT INTO delivery_items (delivery_id, article_id, quantity, unit)
  VALUES (v_delivery_2, v_article_2, 15, 'Tonne');

  INSERT INTO delivery_items (delivery_id, article_id, quantity, unit)
  VALUES (v_delivery_2, v_article_3, 8, 'Tonne');

  RAISE NOTICE 'Created 2 deliveries';

  -- ============================================================================
  -- Create Cashbook Entries
  -- ============================================================================

  -- Opening balance
  INSERT INTO cashbook (
    tenant_id,
    entry_date,
    entry_type,
    amount,
    tax_rate,
    tax_amount,
    description,
    category,
    created_by
  ) VALUES (
    v_tenant_id,
    CURRENT_DATE - interval '30 days',
    'opening_balance',
    5000.00,
    0,
    0,
    'Anfangsbestand Kasse',
    'Opening',
    v_user_id
  );

  -- Income from invoice payment
  INSERT INTO cashbook (
    tenant_id,
    entry_date,
    entry_type,
    amount,
    tax_rate,
    tax_amount,
    description,
    category,
    invoice_id,
    created_by
  ) VALUES (
    v_tenant_id,
    CURRENT_DATE - interval '3 days',
    'income',
    2686.42,
    19.00,
    428.88,
    'Zahlungseingang RE2025-00001',
    'Kundenrechnung',
    v_invoice_1,
    v_user_id
  );

  -- Expense: Fuel
  INSERT INTO cashbook (
    tenant_id,
    entry_date,
    entry_type,
    amount,
    tax_rate,
    tax_amount,
    description,
    category,
    created_by
  ) VALUES (
    v_tenant_id,
    CURRENT_DATE - interval '5 days',
    'expense',
    -150.00,
    19.00,
    -23.95,
    'Tankfüllung LKW B-RK 1234',
    'Betriebskosten',
    v_user_id
  );

  -- Expense: Office supplies
  INSERT INTO cashbook (
    tenant_id,
    entry_date,
    entry_type,
    amount,
    tax_rate,
    tax_amount,
    description,
    category,
    created_by
  ) VALUES (
    v_tenant_id,
    CURRENT_DATE - interval '7 days',
    'expense',
    -89.90,
    19.00,
    -14.35,
    'Büromaterial',
    'Verwaltung',
    v_user_id
  );

  RAISE NOTICE 'Created cashbook entries';

  -- ============================================================================
  -- Create Quotes
  -- ============================================================================

  INSERT INTO quotes (
    tenant_id,
    customer_id,
    quote_number,
    quote_date,
    valid_until,
    status,
    net_amount,
    tax_amount,
    total_amount,
    notes
  ) VALUES (
    v_tenant_id,
    v_customer_4,
    'AN-2025-001',
    CURRENT_DATE,
    CURRENT_DATE + interval '30 days',
    'sent',
    0,
    0,
    0,
    'Angebot für Großbestellung'
  );

  RAISE NOTICE 'Created quote';

  -- ============================================================================
  -- Create Support Ticket (Example)
  -- ============================================================================

  INSERT INTO support_tickets (
    tenant_id,
    created_by,
    title,
    description,
    status,
    priority,
    category
  ) VALUES (
    v_tenant_id,
    v_user_id,
    'Frage zu Mehrwertsteuer',
    'Wie kann ich den Steuersatz für einzelne Artikel anpassen?',
    'open',
    'medium',
    'Frage'
  );

  RAISE NOTICE 'Created support ticket';

  -- ============================================================================
  -- Summary
  -- ============================================================================

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST DATA CREATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'User: juergen.rosskamp@gmail.com';
  RAISE NOTICE 'Customers: 5';
  RAISE NOTICE 'Articles: 5';
  RAISE NOTICE 'Vehicles: 2';
  RAISE NOTICE 'Invoices: 3 (1 paid, 1 sent, 1 draft)';
  RAISE NOTICE 'Deliveries: 2';
  RAISE NOTICE 'Cashbook entries: 4';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'You can now log in and start using the system!';
  RAISE NOTICE '============================================';

END $$;
