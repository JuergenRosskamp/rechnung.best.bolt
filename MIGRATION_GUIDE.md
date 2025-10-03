# Database Migration Guide

## ⚠️ Important: Migrations Need to Be Applied

Your application has **21 database migration files** that need to be applied to your Supabase database.

## Quick Start

### Option 1: Apply All Migrations at Once (Recommended)

1. Open your Supabase Dashboard: https://0ec90b57d6e95fcbda19832f.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the migrations in order (see list below)
4. Click **Run** after each migration

### Option 2: Use Supabase CLI (If Installed)

If you have the Supabase CLI installed locally:

```bash
supabase link --project-ref 0ec90b57d6e95fcbda19832f
supabase db push
```

## Migration Files (Apply in this order)

The migrations are located in `supabase/migrations/` and must be applied in this order:

1. ✅ `20250930211137_create_initial_schema.sql` - Creates tenants, users, subscriptions tables
2. ✅ `20251001054428_create_customers_and_articles.sql` - Creates customers and articles tables
3. ✅ `20251001054514_create_invoices.sql` - Creates invoices and invoice_items tables
4. ✅ `20251001121559_fix_users_rls_infinite_recursion_v2.sql` - Fixes RLS policies
5. ✅ `20251001152849_create_vehicles_and_deliveries.sql` - Creates vehicles and deliveries tables
6. ✅ `20251001174133_add_invoice_number_function.sql` - Adds invoice numbering function
7. ✅ `20251001181226_create_gobd_cashbook.sql` - Creates cashbook for GoBD compliance
8. ✅ `20251001183147_add_bank_details_to_tenants.sql` - Adds bank details to tenants
9. ✅ `20251002100000_add_delivery_locations.sql` - Creates delivery locations table
10. ✅ `20251002120000_add_delivery_and_discount_system.sql` - Adds discount system
11. ✅ `20251002140000_add_advanced_pricing_system.sql` - Adds price groups and history
12. ✅ `20251002160000_add_invoice_layout_system.sql` - Adds custom invoice layouts
13. ✅ `20251002180000_add_gobd_invoice_archiving.sql` - Adds invoice archiving for GoBD
14. ✅ `20251002200000_add_tax_improvements.sql` - Improves tax handling
15. ✅ `20251002210000_add_early_payment_discount.sql` - Adds Skonto (early payment discount)
16. ✅ `20251002220000_add_receipt_management.sql` - Creates receipts table
17. ✅ `20251002230000_create_receipts_storage_bucket.sql` - Creates storage bucket for receipts
18. ✅ `20251003100000_add_receipt_id_to_cashbook.sql` - Links receipts to cashbook
19. ✅ `20251003120000_add_monthly_closing.sql` - Adds monthly closing for cashbook
20. ✅ `20251003140000_add_quotes_and_dunning.sql` - Creates quotes and dunning system
21. ✅ `20251003150000_add_multiuser_and_support.sql` - Adds multi-user and support tickets

## Verification

After applying all migrations, verify by running this SQL in the SQL Editor:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see these tables:
- tenants
- users
- subscriptions
- customers
- articles
- invoices
- invoice_items
- vehicles
- deliveries
- delivery_locations
- cashbook_entries
- cashbook_monthly_closings
- receipts
- price_groups
- article_prices
- invoice_layouts
- invoice_archives
- quotes
- order_confirmations
- dunning_notices
- recurring_invoices
- tenant_users
- support_tickets
- support_ticket_messages
- email_templates
- email_logs

## Need Help?

If you encounter any errors during migration:
1. Check that migrations are applied in the correct order
2. Ensure no duplicate table names exist
3. Check that all referenced tables exist before applying dependent migrations

## Testing After Migration

Once migrations are complete, you can test the application:

```bash
npm run dev
```

Then create a test account and verify all features work correctly.
