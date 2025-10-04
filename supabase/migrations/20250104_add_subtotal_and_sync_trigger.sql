/*
  # Add subtotal column and auto-sync trigger for invoice totals

  1. Schema Changes
    - Add `subtotal` column to invoices table
    - Backfill subtotal from existing invoice_items
    - Make subtotal NOT NULL with default 0

  2. Trigger Function
    - `trg_invoice_recalc_totals()` - Automatically recalculates:
      - subtotal (SUM of line_total from invoice_items)
      - net_amount (same as subtotal)
      - tax_amount (SUM of line_total * tax_rate/100)
      - total_amount (net_amount + tax_amount)

  3. Trigger
    - Fires AFTER INSERT, UPDATE, or DELETE on invoice_items
    - Keeps invoice totals in sync with line items

  ## Important Notes
  - Assumes invoice_items.line_total is the NET amount (pre-tax)
  - Assumes invoice_items.tax_rate is stored as percentage (19.00 = 19%)
  - Uses numeric(12,2) for all currency values
  - Trigger recalculates ALL totals on any invoice_items change
  - If you already have triggers computing totals, review for conflicts

  ## Testing
  Test in staging first:
  1. Verify subtotal is correctly backfilled
  2. Insert/update/delete invoice_items and verify totals update
  3. Check that net_amount = subtotal
  4. Check that total_amount = net_amount + tax_amount
*/

-- ============================================================================
-- STEP 1: Add subtotal column (nullable initially for safe migration)
-- ============================================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS subtotal numeric(12,2);

-- ============================================================================
-- STEP 2: Backfill subtotal from invoice_items
-- ============================================================================

-- Calculate subtotal as SUM(line_total) for each invoice
UPDATE invoices i
SET subtotal = sub.sum_lines
FROM (
  SELECT invoice_id, COALESCE(SUM(line_total), 0)::numeric(12,2) AS sum_lines
  FROM invoice_items
  GROUP BY invoice_id
) AS sub
WHERE i.id = sub.invoice_id;

-- For invoices without any items, set subtotal to 0
UPDATE invoices
SET subtotal = 0
WHERE subtotal IS NULL;

-- ============================================================================
-- STEP 3: Make subtotal NOT NULL with default
-- ============================================================================

ALTER TABLE invoices
  ALTER COLUMN subtotal SET NOT NULL,
  ALTER COLUMN subtotal SET DEFAULT 0;

-- ============================================================================
-- STEP 4: Create trigger function to auto-sync invoice totals
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_invoice_recalc_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_net numeric(12,2);
  v_tax numeric(12,2);
  v_total numeric(12,2);
  v_subtotal numeric(12,2);
  v_invoice_id uuid;
BEGIN
  -- Get invoice_id from NEW (INSERT/UPDATE) or OLD (DELETE)
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Recalculate subtotal as sum of line_total (net amounts)
  SELECT COALESCE(SUM(line_total), 0)::numeric(12,2)
    INTO v_subtotal
  FROM invoice_items
  WHERE invoice_id = v_invoice_id;

  -- Recalculate tax amount using per-line tax_rate
  -- Formula: line_total * (tax_rate / 100.0)
  -- Example: 100.00 * (19.00 / 100.0) = 19.00
  SELECT COALESCE(SUM(line_total * (tax_rate / 100.0)), 0)::numeric(12,2)
    INTO v_tax
  FROM invoice_items
  WHERE invoice_id = v_invoice_id;

  -- Net amount equals subtotal (both are pre-tax)
  v_net := v_subtotal;

  -- Total amount = net + tax
  v_total := (v_net + v_tax)::numeric(12,2);

  -- Update invoice with recalculated values
  UPDATE invoices
  SET
    subtotal     = v_subtotal,
    net_amount   = v_net,
    tax_amount   = v_tax,
    total_amount = v_total,
    updated_at   = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.trg_invoice_recalc_totals() IS
'Automatically recalculates invoice totals (subtotal, net_amount, tax_amount, total_amount) whenever invoice_items are inserted, updated, or deleted. Assumes line_total is net (pre-tax) and tax_rate is stored as percentage.';

-- ============================================================================
-- STEP 5: Install trigger on invoice_items
-- ============================================================================

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS invoice_items_recalc_totals ON invoice_items;

-- Create trigger that fires AFTER any change to invoice_items
CREATE TRIGGER invoice_items_recalc_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_invoice_recalc_totals();

-- Add comment explaining the trigger
COMMENT ON TRIGGER invoice_items_recalc_totals ON invoice_items IS
'Keeps invoice totals in sync with line items. Fires after INSERT, UPDATE, or DELETE on invoice_items.';

-- ============================================================================
-- STEP 6: Create index for performance (optional but recommended)
-- ============================================================================

-- Index on invoice_items.invoice_id for faster aggregation in trigger
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON invoice_items(invoice_id);

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================

/*
-- Check that all invoices have subtotal populated
SELECT COUNT(*) as invoices_with_null_subtotal
FROM invoices
WHERE subtotal IS NULL;
-- Expected: 0

-- Verify subtotal matches sum of line items
SELECT
  i.invoice_number,
  i.subtotal as invoice_subtotal,
  COALESCE(SUM(ii.line_total), 0) as calculated_subtotal,
  i.subtotal - COALESCE(SUM(ii.line_total), 0) as difference
FROM invoices i
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
GROUP BY i.id, i.invoice_number, i.subtotal
HAVING ABS(i.subtotal - COALESCE(SUM(ii.line_total), 0)) > 0.01;
-- Expected: 0 rows (no differences greater than 1 cent)

-- Verify total_amount = net_amount + tax_amount
SELECT
  invoice_number,
  net_amount,
  tax_amount,
  total_amount,
  net_amount + tax_amount as calculated_total,
  total_amount - (net_amount + tax_amount) as difference
FROM invoices
WHERE ABS(total_amount - (net_amount + tax_amount)) > 0.01;
-- Expected: 0 rows

-- Test trigger by inserting a new invoice item
-- (Replace UUIDs with actual values from your database)
/*
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
  'your-invoice-id',
  'your-article-id',
  99,
  'Test Item',
  1,
  100.00,
  19.00,
  100.00
);

-- Check that invoice totals updated automatically
SELECT
  invoice_number,
  subtotal,
  net_amount,
  tax_amount,
  total_amount
FROM invoices
WHERE id = 'your-invoice-id';
-- Expected: subtotal and net_amount increased by 100.00, tax_amount increased by 19.00, total_amount increased by 119.00

-- Clean up test
DELETE FROM invoice_items WHERE description = 'Test Item';
*/
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Migration complete: subtotal column added';
  RAISE NOTICE 'Trigger installed: invoice_items_recalc_totals';
  RAISE NOTICE 'All invoice totals backfilled and in sync';
  RAISE NOTICE '============================================';
END $$;
