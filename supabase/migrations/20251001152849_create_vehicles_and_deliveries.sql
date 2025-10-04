/*
  # Fahrzeugverwaltung & Lieferungen (Vehicle & Delivery Management)

  1. Neue Tabellen
    - `vehicles` - Fahrzeuge (LKW, Transporter, PKW)
    - `vehicle_maintenance` - Wartungshistorie
    - `delivery_notes` - Lieferscheine
    - `delivery_photos` - Lieferfotos (GPS + Unterschriften)

  2. Sicherheit
    - RLS für alle Tabellen aktiviert
    - Tenant-Isolation strikt durchgesetzt
    - Zugriff nur für authentifizierte Nutzer des Mandanten
*/

-- Fahrzeuge Tabelle
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Grunddaten
  license_plate text NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('truck', 'van', 'car', 'trailer', 'other')),
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  vin text,
  
  -- Technische Details
  fuel_type text CHECK (fuel_type IN ('diesel', 'petrol', 'electric', 'hybrid', 'cng')),
  fuel_capacity_liters numeric(10, 2),
  loading_capacity_kg numeric(10, 2),
  loading_capacity_m3 numeric(10, 2),
  emission_class text,
  
  -- Zulassung & Versicherung
  registration_date date,
  next_inspection_date date,
  insurance_expires date,
  insurance_company text,
  insurance_policy_number text,
  
  -- Wartung
  current_mileage_km integer DEFAULT 0,
  last_service_date date,
  last_service_mileage_km integer,
  next_service_due_km integer,
  next_service_due_date date,
  
  -- Zuordnung
  assigned_driver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_branch_id uuid,
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive', 'sold')),
  
  -- Kosten
  purchase_price numeric(10, 2),
  purchase_date date,
  estimated_monthly_costs numeric(10, 2),
  
  -- Notizen
  notes text,
  
  -- Metadaten
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  
  UNIQUE(tenant_id, license_plate)
);

-- Wartungshistorie
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('regular_service', 'repair', 'inspection', 'tire_change', 'other')),
  description text NOT NULL,
  maintenance_date date NOT NULL,
  mileage_km integer NOT NULL,
  
  cost numeric(10, 2) DEFAULT 0,
  workshop_name text,
  invoice_number text,
  invoice_file_url text,
  
  parts_replaced text[],
  next_service_due_km integer,
  next_service_due_date date,
  
  performed_by_user_id uuid REFERENCES users(id),
  
  created_at timestamptz DEFAULT now()
);

-- Lieferscheine
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Referenzen
  delivery_note_number text NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id),
  construction_site_id uuid,
  
  -- Daten
  delivery_date date NOT NULL,
  creation_date date DEFAULT CURRENT_DATE,
  
  -- Lieferadresse
  delivery_address_line1 text NOT NULL,
  delivery_address_line2 text,
  delivery_zip_code text NOT NULL,
  delivery_city text NOT NULL,
  delivery_country text DEFAULT 'DE',
  
  -- Positionen (JSON Array)
  items jsonb NOT NULL DEFAULT '[]',
  
  -- Logistik
  assigned_driver_id uuid REFERENCES users(id),
  assigned_vehicle_id uuid REFERENCES vehicles(id),
  estimated_delivery_time text,
  actual_delivery_time text,
  
  -- Status
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'delivered', 'partially_delivered', 'cancelled')),
  
  -- Liefernachweis
  recipient_name text,
  recipient_signature_url text,
  gps_latitude numeric(10, 6),
  gps_longitude numeric(10, 6),
  gps_timestamp timestamptz,
  
  -- Notizen
  internal_notes text,
  delivery_notes text,
  
  -- Metadaten
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  delivered_by uuid REFERENCES users(id),
  
  UNIQUE(tenant_id, delivery_note_number)
);

-- Lieferfotos
CREATE TABLE IF NOT EXISTS delivery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  photo_url text NOT NULL,
  photo_type text CHECK (photo_type IN ('damage', 'placement', 'signature', 'general')),
  description text,
  
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES users(id)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(assigned_driver_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_tenant ON vehicle_maintenance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_tenant ON delivery_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer ON delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_driver ON delivery_notes(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_delivery ON delivery_photos(delivery_note_id);

-- Row Level Security aktivieren
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Vehicles
CREATE POLICY "Users can view own tenant vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant vehicles"
  ON vehicles FOR UPDATE
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

CREATE POLICY "Users can delete own tenant vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies: Vehicle Maintenance
CREATE POLICY "Users can view own tenant maintenance"
  ON vehicle_maintenance FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant maintenance"
  ON vehicle_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies: Delivery Notes
CREATE POLICY "Users can view own tenant deliveries"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant deliveries"
  ON delivery_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant deliveries"
  ON delivery_notes FOR UPDATE
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

-- RLS Policies: Delivery Photos
CREATE POLICY "Users can view own tenant delivery photos"
  ON delivery_photos FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tenant delivery photos"
  ON delivery_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );
