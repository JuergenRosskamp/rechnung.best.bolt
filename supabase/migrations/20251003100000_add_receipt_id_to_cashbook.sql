/*
  # Add receipt_id to cashbook_entries

  1. Changes
    - Add receipt_id column to cashbook_entries
    - Add foreign key constraint to receipt_uploads
    - Add index for performance

  2. Purpose
    - Link cashbook entries to uploaded receipts
    - Enable GoBD-compliant document management
*/

-- Add receipt_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashbook_entries' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE cashbook_entries
    ADD COLUMN receipt_id uuid REFERENCES receipt_uploads(id);
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cashbook_entries_receipt_id
  ON cashbook_entries(receipt_id)
  WHERE receipt_id IS NOT NULL;
