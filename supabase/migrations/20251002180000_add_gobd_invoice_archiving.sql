/*
  # GoBD-konforme Rechnungsarchivierung

  1. Änderungen an invoices
    - Layout-Snapshot bei Erstellung speichern (unveränderbar)
    - PDF-Archivierung für unveränderbare Rechnungen
    - Revisionssichere Timestamps

  2. Neue Tabelle: invoice_pdfs
    - Speichert generierte PDFs für GoBD-Konformität
    - Unveränderbar nach Erstellung
    - Vollständige Audit-Trail

  3. GoBD-Anforderungen
    - Unveränderbarkeit (keine Updates nach Finalisierung)
    - Vollständigkeit (alle Daten archiviert)
    - Nachvollziehbarkeit (Audit-Trail)
    - Verfügbarkeit (PDFs abrufbar)

  4. Security
    - RLS auf invoice_pdfs
    - Policies für Tenant-Isolation
*/

-- Add layout snapshot to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'layout_snapshot'
  ) THEN
    ALTER TABLE invoices ADD COLUMN layout_snapshot jsonb;
  END IF;
END $$;

-- Add PDF storage reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN pdf_url text;
  END IF;
END $$;

-- Add finalization timestamp (GoBD requirement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

-- Add version number for audit trail
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'version'
  ) THEN
    ALTER TABLE invoices ADD COLUMN version integer DEFAULT 1;
  END IF;
END $$;

-- Create invoice_pdfs table for GoBD archiving
CREATE TABLE IF NOT EXISTS invoice_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- PDF metadata
  pdf_format text NOT NULL CHECK (pdf_format IN ('standard', 'zugferd', 'xrechnung')),
  pdf_url text NOT NULL,
  pdf_size_bytes bigint,

  -- Hash for integrity verification (GoBD requirement)
  pdf_hash text NOT NULL,

  -- Snapshot of invoice data at generation time
  invoice_snapshot jsonb NOT NULL,
  layout_snapshot jsonb NOT NULL,

  -- Generation metadata
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz DEFAULT now() NOT NULL,

  -- GoBD metadata
  is_original boolean DEFAULT true,
  archive_location text,

  created_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure only one original PDF per invoice per format
  UNIQUE(invoice_id, pdf_format, is_original)
);

-- Enable RLS
ALTER TABLE invoice_pdfs ENABLE ROW LEVEL SECURITY;

-- Policies for invoice_pdfs
CREATE POLICY "Users can view own tenant invoice PDFs"
  ON invoice_pdfs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoice PDFs for own tenant"
  ON invoice_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- No update or delete policies - GoBD requires immutability!

-- Create function to prevent invoice changes after finalization
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow changes if not finalized
  IF OLD.finalized_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent any changes to finalized invoices
  RAISE EXCEPTION 'Finalisierte Rechnungen können nicht geändert werden (GoBD-Anforderung)';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce immutability
DROP TRIGGER IF EXISTS enforce_invoice_immutability ON invoices;
CREATE TRIGGER enforce_invoice_immutability
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invoice_modification();

-- Function to finalize invoice (GoBD)
CREATE OR REPLACE FUNCTION finalize_invoice(invoice_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET
    finalized_at = now(),
    status = CASE
      WHEN status = 'draft' THEN 'open'
      ELSE status
    END
  WHERE id = invoice_id_param
    AND finalized_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rechnung nicht gefunden oder bereits finalisiert';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invoice PDF archive entry
CREATE OR REPLACE FUNCTION archive_invoice_pdf(
  p_invoice_id uuid,
  p_pdf_format text,
  p_pdf_url text,
  p_pdf_hash text,
  p_pdf_size_bytes bigint
)
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
  v_invoice_data jsonb;
  v_layout_data jsonb;
  v_pdf_id uuid;
BEGIN
  -- Get tenant_id and invoice data
  SELECT tenant_id, row_to_json(invoices.*)::jsonb
  INTO v_tenant_id, v_invoice_data
  FROM invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rechnung nicht gefunden';
  END IF;

  -- Get layout data
  SELECT row_to_json(invoice_layouts.*)::jsonb
  INTO v_layout_data
  FROM invoice_layouts
  WHERE tenant_id = v_tenant_id
    AND is_default = true
  LIMIT 1;

  -- Create archive entry
  INSERT INTO invoice_pdfs (
    invoice_id,
    tenant_id,
    pdf_format,
    pdf_url,
    pdf_size_bytes,
    pdf_hash,
    invoice_snapshot,
    layout_snapshot,
    generated_by
  ) VALUES (
    p_invoice_id,
    v_tenant_id,
    p_pdf_format,
    p_pdf_url,
    p_pdf_size_bytes,
    p_pdf_hash,
    v_invoice_data,
    COALESCE(v_layout_data, '{}'::jsonb),
    auth.uid()
  )
  RETURNING id INTO v_pdf_id;

  -- Update invoice with PDF URL and layout snapshot
  UPDATE invoices
  SET
    pdf_url = p_pdf_url,
    layout_snapshot = v_layout_data
  WHERE id = p_invoice_id
    AND finalized_at IS NULL;

  RETURN v_pdf_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoice_pdfs_invoice_id ON invoice_pdfs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_pdfs_tenant_id ON invoice_pdfs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_finalized_at ON invoices(finalized_at);

-- Add comment for documentation
COMMENT ON TABLE invoice_pdfs IS 'GoBD-konforme Archivierung von Rechnungs-PDFs mit Unveränderbarkeitsgarantie';
COMMENT ON COLUMN invoices.layout_snapshot IS 'Snapshot des Layouts zum Zeitpunkt der Rechnungserstellung (GoBD)';
COMMENT ON COLUMN invoices.finalized_at IS 'Zeitpunkt der Finalisierung - danach keine Änderungen mehr möglich (GoBD)';
COMMENT ON FUNCTION prevent_invoice_modification() IS 'Verhindert Änderungen an finalisierten Rechnungen (GoBD-Konformität)';
