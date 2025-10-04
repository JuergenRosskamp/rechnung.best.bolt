/*
  # SQL-Funktion für automatische Rechnungsnummern

  1. Funktionen
    - `get_next_invoice_number` - Generiert die nächste Rechnungsnummer
    
  2. Format
    - RE-2025-0001, RE-2025-0002, etc.
    - Jahr wird automatisch eingefügt
    - Nummer wird pro Tenant und Jahr hochgezählt
*/

-- Funktion zum Generieren der nächsten Rechnungsnummer
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year text;
  v_current_number integer;
  v_next_number integer;
  v_invoice_number text;
BEGIN
  -- Aktuelles Jahr
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Hole die aktuelle höchste Nummer für dieses Jahr und Tenant
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM 'RE-\d{4}-(\d+)')
      AS integer
    )
  ), 0)
  INTO v_current_number
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND invoice_number LIKE 'RE-' || v_year || '-%';
  
  -- Nächste Nummer
  v_next_number := v_current_number + 1;
  
  -- Formatiere die Rechnungsnummer mit führenden Nullen (4 Stellen)
  v_invoice_number := 'RE-' || v_year || '-' || LPAD(v_next_number::text, 4, '0');
  
  RETURN v_invoice_number;
END;
$$;
