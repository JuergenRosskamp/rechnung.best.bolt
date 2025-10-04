# Invoice Totals Auto-Sync Migration

## Overview

This migration adds the `subtotal` column to the `invoices` table and installs a trigger that automatically keeps all invoice totals in sync whenever `invoice_items` are inserted, updated, or deleted.

## What Changed

### 1. New Column: `subtotal`

Added to `invoices` table:
```sql
subtotal numeric(12,2) NOT NULL DEFAULT 0
```

**Purpose:** Stores the sum of all line_total values from invoice_items (pre-tax amount).

### 2. Improved Trigger Function: `update_invoice_totals()`

**What it does:**
- Automatically recalculates when invoice_items change
- Updates 4 invoice columns in a single operation:
  - `subtotal` = SUM(line_total) from invoice_items
  - `net_amount` = subtotal (same value)
  - `tax_amount` = SUM(line_total × tax_rate / 100)
  - `total_amount` = net_amount + tax_amount

**Trigger fires on:**
- INSERT into invoice_items
- UPDATE on invoice_items
- DELETE from invoice_items

### 3. Benefits

✅ **Data Consistency** - Totals always match line items
✅ **Performance** - No need to calculate SUM() on every query
✅ **Simplicity** - Application code doesn't need to manage totals
✅ **Audit Trail** - updated_at timestamp updates automatically
✅ **Safe** - Uses SECURITY DEFINER with explicit schema

## Database Schema Changes

### Before (old schema)
```sql
CREATE TABLE invoices (
  ...
  net_amount numeric(10, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(10, 2) NOT NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  ...
);
```

### After (new schema)
```sql
CREATE TABLE invoices (
  ...
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,     -- NEW
  net_amount numeric(12, 2) NOT NULL DEFAULT 0,   -- Changed to numeric(12,2)
  tax_amount numeric(12, 2) NOT NULL DEFAULT 0,   -- Changed to numeric(12,2)
  total_amount numeric(12, 2) NOT NULL DEFAULT 0, -- Changed to numeric(12,2)
  ...
);
```

**Note:** Precision increased from `numeric(10,2)` to `numeric(12,2)` to support larger invoice amounts (up to 9,999,999,999.99 instead of 99,999,999.99).

## How to Apply

### For NEW Databases

If you're setting up a fresh database, simply run:
```sql
-- In Supabase SQL Editor
-- Run SETUP_DATABASE.sql (already includes subtotal + trigger)
```

The updated `SETUP_DATABASE.sql` now includes:
- `subtotal` column in invoices table
- Improved `update_invoice_totals()` function
- Single consolidated trigger on invoice_items

### For EXISTING Databases

If you already have data in your database, run the migration:

1. **Open Supabase SQL Editor**
2. **Copy and paste** the contents of:
   ```
   supabase/migrations/20250104_add_subtotal_and_sync_trigger.sql
   ```
3. **Click Run**

The migration will:
1. Add the `subtotal` column (nullable initially)
2. Backfill subtotal from existing invoice_items
3. Set subtotal to 0 for invoices without items
4. Make subtotal NOT NULL with default 0
5. Install the improved trigger function
6. Create the trigger on invoice_items

### Verification

After applying the migration, verify it worked:

```sql
-- 1. Check that all invoices have subtotal populated
SELECT COUNT(*) as invoices_with_null_subtotal
FROM invoices
WHERE subtotal IS NULL;
-- Expected: 0

-- 2. Verify subtotal matches sum of line items
SELECT
  i.invoice_number,
  i.subtotal as invoice_subtotal,
  COALESCE(SUM(ii.line_total), 0) as calculated_subtotal,
  i.subtotal - COALESCE(SUM(ii.line_total), 0) as difference
FROM invoices i
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
GROUP BY i.id, i.invoice_number, i.subtotal
HAVING ABS(i.subtotal - COALESCE(SUM(ii.line_total), 0)) > 0.01;
-- Expected: 0 rows (no differences)

-- 3. Verify total_amount = net_amount + tax_amount
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
```

## How It Works

### Example: Creating an Invoice

```sql
-- 1. Create invoice (totals start at 0)
INSERT INTO invoices (tenant_id, customer_id, invoice_date, due_date)
VALUES ('tenant-uuid', 'customer-uuid', '2025-01-04', '2025-01-18')
RETURNING id;
-- Result: subtotal=0, net_amount=0, tax_amount=0, total_amount=0

-- 2. Add first item: 100.00 @ 19% tax
INSERT INTO invoice_items (invoice_id, article_id, quantity, unit_price, tax_rate, line_total)
VALUES ('invoice-uuid', 'article-uuid', 1, 100.00, 19.00, 100.00);
-- Trigger fires automatically!
-- Result: subtotal=100.00, net_amount=100.00, tax_amount=19.00, total_amount=119.00

-- 3. Add second item: 50.00 @ 19% tax
INSERT INTO invoice_items (invoice_id, article_id, quantity, unit_price, tax_rate, line_total)
VALUES ('invoice-uuid', 'article-uuid-2', 2, 25.00, 19.00, 50.00);
-- Trigger fires automatically!
-- Result: subtotal=150.00, net_amount=150.00, tax_amount=28.50, total_amount=178.50

-- 4. Update first item quantity
UPDATE invoice_items
SET quantity = 2, line_total = 200.00
WHERE invoice_id = 'invoice-uuid' AND article_id = 'article-uuid';
-- Trigger fires automatically!
-- Result: subtotal=250.00, net_amount=250.00, tax_amount=47.50, total_amount=297.50

-- 5. Delete second item
DELETE FROM invoice_items
WHERE invoice_id = 'invoice-uuid' AND article_id = 'article-uuid-2';
-- Trigger fires automatically!
-- Result: subtotal=200.00, net_amount=200.00, tax_amount=38.00, total_amount=238.00
```

## Important Assumptions

### 1. Line Total is Pre-Tax (Net Amount)

The trigger assumes `invoice_items.line_total` is the **net amount** (before tax):

```
line_total = quantity × unit_price (before tax)
```

**Example:**
- Quantity: 5
- Unit Price: 20.00€
- Tax Rate: 19%
- **line_total**: 100.00€ (net)
- **tax**: 19.00€ (calculated by trigger)
- **total**: 119.00€

If your `line_total` already includes tax, you need to modify the trigger to NOT calculate tax.

### 2. Tax Rate is Stored as Percentage

The trigger assumes `invoice_items.tax_rate` is stored as a percentage:

```
19.00 = 19%
7.00 = 7%
0.00 = 0% (tax-free)
```

**Tax calculation formula:**
```sql
tax_amount = line_total × (tax_rate / 100.0)
```

### 3. Numeric Precision

All currency values use `numeric(12,2)`:
- 12 total digits
- 2 decimal places
- Maximum value: 9,999,999,999.99
- Minimum value: -9,999,999,999.99

This supports invoices up to ~10 billion euros/dollars.

## Troubleshooting

### Issue: "column invoices.subtotal does not exist"

**Cause:** Migration hasn't been applied yet.

**Solution:** Run the migration file:
```
supabase/migrations/20250104_add_subtotal_and_sync_trigger.sql
```

### Issue: Totals don't update automatically

**Cause:** Trigger may not be installed or was dropped.

**Solution:** Reinstall the trigger:
```sql
DROP TRIGGER IF EXISTS invoice_items_recalc_totals ON invoice_items;

CREATE TRIGGER invoice_items_recalc_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_totals();
```

### Issue: "infinite recursion detected"

**Cause:** Trigger is recursively calling itself.

**Solution:** The trigger uses `RETURN NULL` (not `RETURN NEW`) to prevent recursion. Verify the function code matches the migration file exactly.

### Issue: Subtotal doesn't match sum of line items

**Cause 1:** Old trigger function still in use.

**Solution:** Replace with new function from migration file.

**Cause 2:** Manual UPDATE to invoices bypassed trigger.

**Solution:** Manually recalculate:
```sql
UPDATE invoices i
SET subtotal = sub.sum_lines
FROM (
  SELECT invoice_id, COALESCE(SUM(line_total), 0)::numeric(12,2) AS sum_lines
  FROM invoice_items
  GROUP BY invoice_id
) AS sub
WHERE i.id = sub.invoice_id;
```

## Application Code Changes

### Before (manual calculation)

```typescript
// OLD: Application had to calculate totals
const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
const tax = items.reduce((sum, item) => sum + (item.line_total * item.tax_rate / 100), 0);
const total = subtotal + tax;

await supabase
  .from('invoices')
  .update({
    net_amount: subtotal,
    tax_amount: tax,
    total_amount: total
  })
  .eq('id', invoiceId);
```

### After (automatic via trigger)

```typescript
// NEW: Just insert/update items, totals update automatically
await supabase
  .from('invoice_items')
  .insert({
    invoice_id: invoiceId,
    article_id: articleId,
    quantity: 5,
    unit_price: 20.00,
    tax_rate: 19.00,
    line_total: 100.00
  });

// Totals are already updated in database!
// No need to manually update invoices table
```

### Querying Invoices

```typescript
// All totals are pre-calculated and ready to use
const { data: invoice } = await supabase
  .from('invoices')
  .select('invoice_number, subtotal, net_amount, tax_amount, total_amount')
  .eq('id', invoiceId)
  .single();

console.log(invoice);
// {
//   invoice_number: "RE2025-00001",
//   subtotal: 100.00,      // SUM of line items
//   net_amount: 100.00,    // Same as subtotal
//   tax_amount: 19.00,     // Calculated tax
//   total_amount: 119.00   // Net + tax
// }
```

## Performance Impact

### Before Migration

**Every invoice query needed to JOIN with invoice_items:**
```sql
SELECT
  i.*,
  COALESCE(SUM(ii.line_total), 0) as subtotal,
  COALESCE(SUM(ii.line_total * ii.tax_rate / 100), 0) as tax
FROM invoices i
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
GROUP BY i.id;
```

**Cost:** O(n × m) where n = invoices, m = avg items per invoice

### After Migration

**Simple SELECT, no JOIN needed:**
```sql
SELECT
  invoice_number,
  subtotal,
  net_amount,
  tax_amount,
  total_amount
FROM invoices;
```

**Cost:** O(n) - much faster!

**Trade-off:** Small overhead on INSERT/UPDATE/DELETE of invoice_items (negligible for typical workloads).

## Rollback (if needed)

If you need to revert the migration:

```sql
-- 1. Drop trigger
DROP TRIGGER IF EXISTS invoice_items_recalc_totals ON invoice_items;

-- 2. Drop function
DROP FUNCTION IF EXISTS public.update_invoice_totals();

-- 3. Remove subtotal column (CAUTION: data loss!)
ALTER TABLE invoices DROP COLUMN IF EXISTS subtotal;

-- 4. Restore old numeric precision (optional)
ALTER TABLE invoices
  ALTER COLUMN net_amount TYPE numeric(10,2),
  ALTER COLUMN tax_amount TYPE numeric(10,2),
  ALTER COLUMN total_amount TYPE numeric(10,2);
```

**⚠️ Warning:** This will delete the subtotal column and all its data permanently!

## Files Modified

1. **`supabase/migrations/20250104_add_subtotal_and_sync_trigger.sql`**
   - New migration file for existing databases
   - Adds subtotal column
   - Backfills data
   - Installs trigger

2. **`SETUP_DATABASE.sql`**
   - Updated invoices table schema
   - Updated quotes table schema (also has subtotal now)
   - Improved trigger function
   - Consolidated trigger (removed 3 separate triggers)

3. **`SETUP_TESTDATA.sql`**
   - No changes needed (trigger handles totals automatically)

## Support

If you encounter issues:

1. Check the verification queries above
2. Review assumptions section
3. Check Supabase logs for errors
4. Verify trigger exists: `\d invoice_items` in psql
5. Test with a simple INSERT/UPDATE/DELETE

## Summary

✅ **`subtotal` column added** to invoices and quotes tables
✅ **Auto-sync trigger** installed on invoice_items
✅ **4 totals kept in sync**: subtotal, net_amount, tax_amount, total_amount
✅ **Improved precision**: numeric(12,2) for larger amounts
✅ **Better performance**: No more expensive JOINs
✅ **Simplified code**: Application doesn't manage totals
✅ **Backward compatible**: Existing queries still work

The invoice system now automatically maintains accurate totals with zero effort from your application code!
