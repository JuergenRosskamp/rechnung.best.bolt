# Quick Verification Steps

You've updated the database with the subtotal migration. Here's how to verify everything is working:

## Step 1: Run Verification Script

1. **Open Supabase SQL Editor**
2. **Copy and paste** the entire contents of: `VERIFY_SUBTOTAL_MIGRATION.sql`
3. **Click Run**

### Expected Results:

You should see:
```
✅ TEST 1: Subtotal column exists - PASS
✅ TEST 2: All invoices have subtotal - PASS
✅ TEST 3: Trigger function exists - PASS
✅ TEST 4: Trigger installed - PASS
✅ TEST 5: Subtotal accuracy - PASS
✅ TEST 6: Total calculation accuracy - PASS
```

Plus a summary of your invoice totals.

## Step 2: Test the Trigger (Optional)

To verify the trigger automatically updates totals when you modify invoice items:

### Option A: In SQL Editor

Uncomment and run the trigger test block at the end of `VERIFY_SUBTOTAL_MIGRATION.sql`

### Option B: In Your Application

1. **Open an existing invoice** or create a new one
2. **Add a line item** (e.g., 100.00 @ 19% tax)
3. **Check the invoice totals** - they should update automatically:
   - subtotal: 100.00
   - net_amount: 100.00
   - tax_amount: 19.00
   - total_amount: 119.00

4. **Add another item** (e.g., 50.00 @ 19% tax)
5. **Check totals again** - should now show:
   - subtotal: 150.00
   - net_amount: 150.00
   - tax_amount: 28.50
   - total_amount: 178.50

6. **Delete an item** - totals should recalculate immediately

## What to Look For

### ✅ Good Signs:
- All 6 verification tests pass
- Invoice totals match the sum of line items
- total_amount = net_amount + tax_amount
- Totals update immediately when adding/editing/deleting items

### ❌ Potential Issues:

**If TEST 1 fails:**
- The subtotal column wasn't added
- Re-run: `supabase/migrations/20250104_add_subtotal_and_sync_trigger.sql`

**If TEST 3 or 4 fails:**
- The trigger wasn't installed
- Re-run: `supabase/migrations/20250104_add_subtotal_and_sync_trigger.sql`

**If TEST 5 or 6 fails:**
- Some invoices have incorrect totals
- Run this to fix:
```sql
-- Recalculate all invoice totals
UPDATE invoices i
SET subtotal = sub.sum_lines,
    net_amount = sub.sum_lines,
    tax_amount = sub.sum_tax,
    total_amount = sub.sum_lines + sub.sum_tax
FROM (
  SELECT
    invoice_id,
    COALESCE(SUM(line_total), 0)::numeric(12,2) AS sum_lines,
    COALESCE(SUM(line_total * (tax_rate/100.0)), 0)::numeric(12,2) AS sum_tax
  FROM invoice_items
  GROUP BY invoice_id
) AS sub
WHERE i.id = sub.invoice_id;
```

## How It Works Now

### Before (Manual):
```typescript
// Had to calculate totals in application code
const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
await supabase.from('invoices').update({ net_amount: subtotal, ... });
```

### After (Automatic):
```typescript
// Just insert/update items - totals update automatically!
await supabase.from('invoice_items').insert({ ... });
// Done! Invoice totals are already updated by the trigger
```

## Quick Reference

**What the trigger does:**
- Fires after INSERT/UPDATE/DELETE on invoice_items
- Automatically calculates:
  - `subtotal` = SUM(line_total)
  - `net_amount` = subtotal
  - `tax_amount` = SUM(line_total × tax_rate/100)
  - `total_amount` = net_amount + tax_amount

**When does it run:**
- ✅ Adding invoice items
- ✅ Editing invoice items
- ✅ Deleting invoice items
- ❌ NOT when directly updating invoices table (intentional)

**Performance:**
- Very fast (simple SUM queries)
- Indexed on invoice_items.invoice_id
- No noticeable overhead

## Next Steps

1. ✅ Run `VERIFY_SUBTOTAL_MIGRATION.sql` to confirm everything works
2. ✅ Test adding/editing invoice items in your app
3. ✅ Read `INVOICE_TOTALS_MIGRATION.md` for complete documentation
4. ✅ Remove old manual total calculation code from your app (if any)

## Files Reference

- **Migration:** `supabase/migrations/20250104_add_subtotal_and_sync_trigger.sql`
- **Verification:** `VERIFY_SUBTOTAL_MIGRATION.sql` (this runs tests)
- **Documentation:** `INVOICE_TOTALS_MIGRATION.md` (complete guide)
- **Schema:** `SETUP_DATABASE.sql` (includes subtotal + trigger for new DBs)

## Summary

Your database now has:
- ✅ `subtotal` column on invoices
- ✅ Auto-sync trigger on invoice_items
- ✅ All totals kept in perfect sync
- ✅ No application code changes needed

Just use the verification script to confirm everything is working correctly! 🎉
