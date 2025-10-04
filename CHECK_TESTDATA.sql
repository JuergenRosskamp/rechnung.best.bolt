-- ============================================================================
-- QUICK CHECK: Test Data Verification
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify test data
-- ============================================================================

-- Check 1: Tenant and User
SELECT
  t.company_name,
  u.email,
  u.role,
  u.first_name,
  u.last_name,
  s.plan_type,
  s.status
FROM tenants t
JOIN users u ON u.tenant_id = t.id
JOIN subscriptions s ON s.tenant_id = t.id
WHERE u.email = 'juergen.rosskamp@gmail.com';
-- Expected: 1 row - Rosskamp Logistik GmbH, admin user, rechnung.best plan

-- ============================================================================

-- Check 2: Customers
SELECT
  customer_number,
  company_name,
  city,
  payment_terms_days,
  early_payment_discount_percent,
  early_payment_discount_days
FROM customers
ORDER BY customer_number;
-- Expected: 5 rows (KD-1001 to KD-1005)

-- ============================================================================

-- Check 3: Articles
SELECT
  article_number,
  name,
  unit_price,
  tax_rate,
  unit
FROM articles
ORDER BY article_number;
-- Expected: 5 rows (ART-001 to ART-003, SRV-001 to SRV-002)

-- ============================================================================

-- Check 4: Delivery Locations
SELECT
  c.customer_number,
  c.company_name,
  dl.location_name,
  dl.city
FROM delivery_locations dl
JOIN customers c ON c.id = dl.customer_id
ORDER BY c.customer_number, dl.location_name;
-- Expected: 10 rows (2 locations per customer)

-- ============================================================================

-- Check 5: Vehicles
SELECT
  license_plate,
  vehicle_type,
  make,
  model,
  capacity
FROM vehicles
ORDER BY license_plate;
-- Expected: 2 rows (B-TR 1234, B-LF 5678)

-- ============================================================================

-- Check 6: Invoices
SELECT
  invoice_number,
  c.customer_number,
  c.company_name,
  i.invoice_date,
  i.status,
  i.net_amount,
  i.tax_amount,
  i.total_amount,
  i.paid_amount
FROM invoices i
JOIN customers c ON c.id = i.customer_id
ORDER BY i.invoice_number;
-- Expected: 3 rows (RE2025-00001 to RE2025-00003)

-- ============================================================================

-- Check 7: Invoice Items Detail
SELECT
  i.invoice_number,
  ii.position,
  a.article_number,
  a.name,
  ii.quantity,
  ii.unit_price,
  ii.line_total
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
JOIN articles a ON a.id = ii.article_id
ORDER BY i.invoice_number, ii.position;
-- Expected: Multiple rows showing all invoice line items

-- ============================================================================

-- Check 8: Deliveries
SELECT
  d.delivery_date,
  c.customer_number,
  c.company_name,
  v.license_plate,
  d.status,
  dl.location_name
FROM deliveries d
JOIN customers c ON c.id = d.customer_id
JOIN vehicles v ON v.id = d.vehicle_id
LEFT JOIN delivery_locations dl ON dl.id = d.delivery_location_id
ORDER BY d.delivery_date;
-- Expected: 2 rows (1 completed, 1 planned)

-- ============================================================================

-- Check 9: Cashbook
SELECT
  entry_date,
  entry_type,
  amount,
  tax_amount,
  description,
  category
FROM cashbook
ORDER BY entry_date;
-- Expected: 5 rows

-- Cashbook Summary
SELECT
  entry_type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  SUM(tax_amount) as total_tax
FROM cashbook
GROUP BY entry_type
ORDER BY entry_type;
-- Expected: opening_balance (1), income (2), expense (2)

-- Current Cash Balance
SELECT
  SUM(amount) as current_balance,
  SUM(tax_amount) as total_tax
FROM cashbook;
-- Expected: ~7,141.08 EUR

-- ============================================================================

-- Check 10: Quotes
SELECT
  quote_number,
  c.customer_number,
  c.company_name,
  q.quote_date,
  q.valid_until,
  q.status,
  q.net_amount,
  q.tax_amount,
  q.total_amount
FROM quotes q
JOIN customers c ON c.id = q.customer_id
ORDER BY q.quote_number;
-- Expected: 1 row (AN2025-00001, draft)

-- ============================================================================

-- Check 11: Recurring Invoices
SELECT
  c.customer_number,
  c.company_name,
  ri.frequency,
  ri.next_invoice_date,
  ri.status,
  ri.net_amount,
  ri.tax_amount,
  ri.total_amount
FROM recurring_invoices ri
JOIN customers c ON c.id = ri.customer_id
ORDER BY c.customer_number;
-- Expected: 1 row (Becker Handel, monthly)

-- ============================================================================

-- Check 12: Pricing Special Cases
-- Volume Discounts
SELECT
  a.article_number,
  a.name,
  avd.min_quantity,
  avd.discounted_price,
  a.unit_price - avd.discounted_price as discount
FROM article_volume_discounts avd
JOIN articles a ON a.id = avd.article_id
ORDER BY a.article_number, avd.min_quantity;
-- Expected: 2 rows (10 and 50 pieces discount for Beton)

-- Time-Based Prices
SELECT
  a.article_number,
  a.name,
  atbp.valid_from,
  atbp.valid_to,
  atbp.price,
  atbp.price - a.unit_price as premium
FROM article_time_based_prices atbp
JOIN articles a ON a.id = atbp.article_id
ORDER BY a.article_number;
-- Expected: 1 row (Winter price for Beton)

-- Customer Price Overrides
SELECT
  c.customer_number,
  c.company_name,
  a.article_number,
  a.name,
  a.unit_price as standard_price,
  cpo.override_price,
  a.unit_price - cpo.override_price as discount
FROM customer_price_overrides cpo
JOIN customers c ON c.id = cpo.customer_id
JOIN articles a ON a.id = cpo.article_id
ORDER BY c.customer_number, a.article_number;
-- Expected: 1 row (Müller Baumarkt special price for Beton)

-- ============================================================================

-- Check 13: Payment Summary
SELECT
  i.invoice_number,
  i.total_amount,
  i.paid_amount,
  i.total_amount - COALESCE(i.paid_amount, 0) as outstanding,
  CASE
    WHEN i.paid_amount >= i.total_amount THEN 'Fully Paid'
    WHEN i.paid_amount > 0 THEN 'Partially Paid'
    ELSE 'Unpaid'
  END as payment_status
FROM invoices i
ORDER BY i.invoice_number;
-- Expected: 1 paid, 1 unpaid, 1 draft

-- ============================================================================

-- Check 14: Data Completeness Summary
SELECT
  'Tenants' as table_name, COUNT(*) as row_count FROM tenants
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Customer Contacts', COUNT(*) FROM customer_contacts
UNION ALL
SELECT 'Articles', COUNT(*) FROM articles
UNION ALL
SELECT 'Delivery Locations', COUNT(*) FROM delivery_locations
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'Invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'Invoice Items', COUNT(*) FROM invoice_items
UNION ALL
SELECT 'Invoice Payments', COUNT(*) FROM invoice_payments
UNION ALL
SELECT 'Deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'Delivery Items', COUNT(*) FROM delivery_items
UNION ALL
SELECT 'Cashbook', COUNT(*) FROM cashbook
UNION ALL
SELECT 'Quotes', COUNT(*) FROM quotes
UNION ALL
SELECT 'Quote Items', COUNT(*) FROM quote_items
UNION ALL
SELECT 'Recurring Invoices', COUNT(*) FROM recurring_invoices
ORDER BY table_name;

-- Expected counts:
-- Tenants: 1
-- Users: 1
-- Subscriptions: 1
-- Customers: 5
-- Customer Contacts: 5
-- Articles: 5
-- Delivery Locations: 10
-- Vehicles: 2
-- Invoices: 3
-- Invoice Items: ~9
-- Invoice Payments: 1
-- Deliveries: 2
-- Delivery Items: ~4
-- Cashbook: 5
-- Quotes: 1
-- Quote Items: ~3
-- Recurring Invoices: 1

-- ============================================================================
-- DONE
-- ============================================================================
