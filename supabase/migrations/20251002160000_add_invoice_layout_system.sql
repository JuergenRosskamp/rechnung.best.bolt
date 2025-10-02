/*
  # Invoice Layout System

  1. New Tables
    - `invoice_layouts`
      - Layout configuration for tenant invoices
      - Stores design templates and customization options
      - Includes logo storage

  2. Changes
    - Add invoice_layout_id to tenants
    - Create default templates

  3. Security
    - Enable RLS on invoice_layouts
    - Add policies for tenant isolation
*/

-- Create invoice_layouts table
CREATE TABLE IF NOT EXISTS invoice_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template selection
  template_name text NOT NULL DEFAULT 'modern',

  -- Logo configuration
  logo_url text,
  logo_width integer DEFAULT 120,
  logo_height integer DEFAULT 40,
  logo_position text DEFAULT 'top-left' CHECK (logo_position IN ('top-left', 'top-center', 'top-right')),

  -- Color scheme
  primary_color text DEFAULT '#0ea5e9',
  secondary_color text DEFAULT '#64748b',
  accent_color text DEFAULT '#0284c7',
  text_color text DEFAULT '#1e293b',

  -- Typography
  font_family text DEFAULT 'helvetica' CHECK (font_family IN ('helvetica', 'times', 'courier')),
  font_size_base integer DEFAULT 10,
  font_size_heading integer DEFAULT 20,

  -- Header configuration
  show_company_slogan boolean DEFAULT true,
  company_slogan text,
  header_background_color text DEFAULT '#ffffff',
  header_text_color text DEFAULT '#1e293b',

  -- Footer configuration
  footer_text text,
  show_page_numbers boolean DEFAULT true,
  show_qr_code boolean DEFAULT false,

  -- Layout options
  show_item_images boolean DEFAULT false,
  show_line_numbers boolean DEFAULT true,
  show_tax_breakdown boolean DEFAULT true,
  paper_size text DEFAULT 'A4' CHECK (paper_size IN ('A4', 'Letter')),

  -- Spacing and margins
  margin_top integer DEFAULT 20,
  margin_bottom integer DEFAULT 20,
  margin_left integer DEFAULT 20,
  margin_right integer DEFAULT 20,
  line_spacing decimal DEFAULT 1.2,

  -- Additional customizations
  show_bank_details boolean DEFAULT true,
  show_terms_conditions boolean DEFAULT false,
  terms_conditions_text text,

  -- Metadata
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add invoice_layout_id to tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'invoice_layout_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN invoice_layout_id uuid REFERENCES invoice_layouts(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE invoice_layouts ENABLE ROW LEVEL SECURITY;

-- Policies for invoice_layouts
CREATE POLICY "Users can view own tenant layouts"
  ON invoice_layouts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create layouts for own tenant"
  ON invoice_layouts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant layouts"
  ON invoice_layouts FOR UPDATE
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

CREATE POLICY "Users can delete own tenant layouts"
  ON invoice_layouts FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_invoice_layouts_updated_at ON invoice_layouts;
CREATE TRIGGER update_invoice_layouts_updated_at
  BEFORE UPDATE ON invoice_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_layouts_updated_at();

-- Create default layouts for existing tenants
INSERT INTO invoice_layouts (tenant_id, template_name, is_default)
SELECT id, 'modern', true
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_layouts WHERE tenant_id = tenants.id
);

-- Update tenants to reference their default layout
UPDATE tenants t
SET invoice_layout_id = (
  SELECT id FROM invoice_layouts
  WHERE tenant_id = t.id AND is_default = true
  LIMIT 1
)
WHERE invoice_layout_id IS NULL;
