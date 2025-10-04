/*
  # Create Receipts Storage Bucket

  1. Storage Setup
    - Create storage bucket `receipts` for receipt uploads
    - Configure bucket to be private (not public)
    - Enable RLS on storage.objects table

  2. Security Policies
    - Users can only access receipts from their own tenant
    - Policies for INSERT, SELECT, UPDATE, DELETE operations
*/

-- Create the receipts bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

-- Enable RLS on storage.objects (should already be enabled, but ensure it)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload receipts to their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can view receipts from their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can update receipts from their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete receipts from their tenant" ON storage.objects;

-- Policy: Users can upload receipts to their tenant folder
CREATE POLICY "Users can upload receipts to their tenant"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can view receipts from their tenant
CREATE POLICY "Users can view receipts from their tenant"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can update receipts from their tenant
CREATE POLICY "Users can update receipts from their tenant"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can delete receipts from their tenant
CREATE POLICY "Users can delete receipts from their tenant"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM users
    WHERE id = auth.uid()
  )
);
