-- ============================================================================
-- VERIFICATION SCRIPT: Subtotal Migration & Auto-Sync Trigger
-- ============================================================================
-- Run this in Supabase SQL Editor to verify the migration was successful
-- ============================================================================

-- TEST 1: Check if subtotal column exists
-- ============================================================================
SELECT
  'TEST 1: Subtotal column exists' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'subtotal'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- TEST 2: Check if all invoices have subtotal populated (not null)
-- ============================================================================
SELECT
  'TEST 2: All invoices have subtotal' as test_name,
  CASE
    WHEN (SELECT COUNT(*) FROM invoices WHERE subtotal IS NULL) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL - ' || (SELECT COUNT(*) FROM invoices WHERE subtotal IS NULL) || ' invoices missing subtotal'
  END as result;

-- TEST 3: Check if trigger function exists
-- ============================================================================
SELECT
  'TEST 3: Trigger function exists' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'update_invoice_totals'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- TEST 4: Check if trigger is installed on invoice_items
-- ============================================================================
SELECT
  'TEST 4: Trigger installed' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'invoice_items_recalc_totals'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- TEST 5: Verify subtotal matches sum of line items for all invoices
-- ============================================================================
WITH invoice_check AS (
  SELECT
    i.id,
    i.invoice_number,
    i.subtotal as stored_subtotal,
    COALESCE(SUM(ii.line_total), 0)::numeric(12,2) as calculated_subtotal,
    ABS(i.subtotal - COALESCE(SUM(ii.line_total), 0)) as difference
  FROM invoices i
  LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
  GROUP BY i.id, i.invoice_number, i.subtotal
)
SELECT
  'TEST 5: Subtotal accuracy' as test_name,
  CASE
    WHEN (SELECT COUNT(*) FROM invoice_check WHERE difference > 0.01) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL - ' || (SELECT COUNT(*) FROM invoice_check WHERE difference > 0.01) || ' invoices have incorrect subtotal'
  END as result;

-- TEST 6: Verify total_amount = net_amount + tax_amount
-- ============================================================================
WITH total_check AS (
  SELECT
    invoice_number,
    net_amount,
    tax_amount,
    total_amount,
    ABS(total_amount - (net_amount + tax_amount)) as difference
  FROM invoices
)
SELECT
  'TEST 6: Total calculation accuracy' as test_name,
  CASE
    WHEN (SELECT COUNT(*) FROM total_check WHERE difference > 0.01) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL - ' || (SELECT COUNT(*) FROM total_check WHERE difference > 0.01) || ' invoices have incorrect totals'
  END as result;

-- ============================================================================
-- DETAILED RESULTS: Show invoice totals
-- ============================================================================
SELECT
  '--- INVOICE TOTALS SUMMARY ---' as section,
  NULL as invoice_number,
  NULL::numeric as subtotal,
  NULL::numeric as net_amount,
  NULL::numeric as tax_amount,
  NULL::numeric as total_amount,
  NULL::text as status;

SELECT
  'Invoice' as section,
  invoice_number,
  subtotal,
  net_amount,
  tax_amount,
  total_amount,
  status
FROM invoices
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- DETAILED RESULTS: Show any invoices with mismatched totals
-- ============================================================================
WITH invoice_check AS (
  SELECT
    i.invoice_number,
    i.subtotal as stored_subtotal,
    COALESCE(SUM(ii.line_total), 0)::numeric(12,2) as calculated_subtotal,
    i.net_amount,
    i.tax_amount,
    i.total_amount,
    (i.net_amount + i.tax_amount)::numeric(12,2) as calculated_total
  FROM invoices i
  LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
  GROUP BY i.id, i.invoice_number, i.subtotal, i.net_amount, i.tax_amount, i.total_amount
  HAVING
    ABS(i.subtotal - COALESCE(SUM(ii.line_total), 0)) > 0.01
    OR ABS(i.total_amount - (i.net_amount + i.tax_amount)) > 0.01
)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No mismatches found'
    ELSE '❌ ' || COUNT(*) || ' invoices with mismatches'
  END as mismatch_summary
FROM invoice_check;

-- Show details if any mismatches
SELECT
  invoice_number,
  stored_subtotal,
  calculated_subtotal,
  stored_subtotal - calculated_subtotal as subtotal_diff,
  total_amount,
  calculated_total,
  total_amount - calculated_total as total_diff
FROM (
  SELECT
    i.invoice_number,
    i.subtotal as stored_subtotal,
    COALESCE(SUM(ii.line_total), 0)::numeric(12,2) as calculated_subtotal,
    i.total_amount,
    (i.net_amount + i.tax_amount)::numeric(12,2) as calculated_total
  FROM invoices i
  LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
  GROUP BY i.id, i.invoice_number, i.subtotal, i.net_amount, i.tax_amount, i.total_amount
  HAVING
    ABS(i.subtotal - COALESCE(SUM(ii.line_total), 0)) > 0.01
    OR ABS(i.total_amount - (i.net_amount + i.tax_amount)) > 0.01
) AS mismatches;

-- ============================================================================
-- TRIGGER TEST: Test automatic recalculation
-- ============================================================================
-- This creates a test invoice and verifies the trigger works
-- You can run this manually if you want to test the trigger

/*
DO $$
DECLARE
  v_test_tenant_id uuid;
  v_test_customer_id uuid;
  v_test_article_id uuid;
  v_test_invoice_id uuid;
  v_initial_total numeric(12,2);
  v_final_total numeric(12,2);
BEGIN
  -- Get a tenant, customer, and article (or create test data)
  SELECT id INTO v_test_tenant_id FROM tenants LIMIT 1;
  SELECT id INTO v_test_customer_id FROM customers LIMIT 1;
  SELECT id INTO v_test_article_id FROM articles LIMIT 1;

  IF v_test_tenant_id IS NULL OR v_test_customer_id IS NULL OR v_test_article_id IS NULL THEN
    RAISE NOTICE '❌ TEST SKIPPED: Missing test data (tenant/customer/article)';
    RETURN;
  END IF;

  -- Create test invoice
  INSERT INTO invoices (
    tenant_id,
    customer_id,
    invoice_date,
    due_date,
    status
  ) VALUES (
    v_test_tenant_id,
    v_test_customer_id,
    CURRENT_DATE,
    CURRENT_DATE + 14,
    'draft'
  ) RETURNING id INTO v_test_invoice_id;

  -- Check initial totals (should be 0)
  SELECT total_amount INTO v_initial_total
  FROM invoices
  WHERE id = v_test_invoice_id;

  RAISE NOTICE '--- TRIGGER TEST ---';
  RAISE NOTICE 'Created invoice ID: %', v_test_invoice_id;
  RAISE NOTICE 'Initial total_amount: %', v_initial_total;

  -- Add an invoice item (100.00 @ 19% tax)
  INSERT INTO invoice_items (
    invoice_id,
    article_id,
    position,
    description,
    quantity,
    unit_price,
    tax_rate,
    line_total
  ) VALUES (
    v_test_invoice_id,
    v_test_article_id,
    1,
    'Test Item - Trigger Verification',
    1,
    100.00,
    19.00,
    100.00
  );

  -- Check if totals updated automatically
  SELECT total_amount INTO v_final_total
  FROM invoices
  WHERE id = v_test_invoice_id;

  RAISE NOTICE 'After adding item, total_amount: %', v_final_total;

  IF v_final_total = 119.00 THEN
    RAISE NOTICE '✅ TRIGGER TEST PASSED: Total automatically updated to 119.00';
  ELSE
    RAISE NOTICE '❌ TRIGGER TEST FAILED: Expected 119.00, got %', v_final_total;
  END IF;

  -- Cleanup test data
  DELETE FROM invoices WHERE id = v_test_invoice_id;
  RAISE NOTICE 'Test invoice deleted';

END $$;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT
  '=== MIGRATION VERIFICATION COMPLETE ===' as summary;

SELECT
  'If all tests show ✅ PASS, the migration was successful!' as note;

SELECT
  'To manually test the trigger, uncomment and run the trigger test block above.' as instructions;
