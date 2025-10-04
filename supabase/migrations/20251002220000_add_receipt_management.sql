/*
  # Receipt Management for Cashbook Entries

  1. New Tables
    - `receipt_uploads`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants)
      - `cashbook_entry_id` (uuid, references cashbook_entries, nullable)
      - `file_name` (text)
      - `file_path` (text) - storage path
      - `file_size` (bigint)
      - `mime_type` (text)
      - `ocr_status` (text) - processing, completed, failed
      - `ocr_data` (jsonb) - extracted data from AI/OCR
      - `created_by` (uuid, references users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `receipt_id` column to `cashbook_entries` table

  3. Security
    - Enable RLS on `receipt_uploads` table
    - Add policies for tenant-scoped access

  4. Storage
    - Create storage bucket `receipts` for document uploads
    - Add RLS policies for bucket access
*/

-- Create receipt_uploads table
CREATE TABLE IF NOT EXISTS receipt_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cashbook_entry_id uuid REFERENCES cashbook_entries(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  ocr_status text NOT NULL DEFAULT 'processing' CHECK (ocr_status IN ('processing', 'completed', 'failed')),
  ocr_data jsonb,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add receipt_id to cashbook_entries if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashbook_entries' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE cashbook_entries ADD COLUMN receipt_id uuid REFERENCES receipt_uploads(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE receipt_uploads ENABLE ROW LEVEL SECURITY;

-- Policies for receipt_uploads
CREATE POLICY "Users can view receipts from their tenant"
  ON receipt_uploads
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert receipts for their tenant"
  ON receipt_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update receipts from their tenant"
  ON receipt_uploads
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete receipts from their tenant"
  ON receipt_uploads
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies will be added via Supabase dashboard or API
-- These ensure users can only access receipts from their tenant

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_tenant_id ON receipt_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_cashbook_entry_id ON receipt_uploads(cashbook_entry_id);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_created_at ON receipt_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cashbook_entries_receipt_id ON cashbook_entries(receipt_id);
