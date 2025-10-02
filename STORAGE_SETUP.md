# Storage Bucket Setup für Beleg-Upload

## Problem
Der Storage Bucket `receipts` existiert noch nicht in Ihrer Supabase-Instanz.

## Lösung: Manuelles Einrichten über Supabase Dashboard

### Schritt 1: Bucket erstellen

1. Öffnen Sie das Supabase Dashboard: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt aus
3. Navigieren Sie zu **Storage** in der linken Sidebar
4. Klicken Sie auf **"New bucket"**
5. Geben Sie folgende Einstellungen ein:
   - **Name**: `receipts`
   - **Public**: `OFF` (ausgeschaltet)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**:
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
     - `application/pdf`

### Schritt 2: RLS Policies für Storage einrichten

Nach dem Erstellen des Buckets:

1. Klicken Sie auf den `receipts` Bucket
2. Gehen Sie zu **Policies**
3. Klicken Sie auf **"New Policy"**

#### Policy 1: Upload erlauben
```sql
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
```

#### Policy 2: Anzeigen erlauben
```sql
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
```

#### Policy 3: Update erlauben
```sql
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
```

#### Policy 4: Löschen erlauben
```sql
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
```

### Alternative: SQL Editor verwenden

Sie können auch alle Schritte auf einmal im **SQL Editor** ausführen:

1. Gehen Sie zu **SQL Editor** im Supabase Dashboard
2. Führen Sie folgendes SQL aus:

```sql
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

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create all policies
CREATE POLICY "Users can upload receipts to their tenant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can view receipts from their tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can update receipts from their tenant"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM users WHERE id = auth.uid())
)
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can delete receipts from their tenant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM users WHERE id = auth.uid())
);
```

### Schritt 3: Testen

Nach dem Setup sollte der Beleg-Upload funktionieren:

1. Gehen Sie zu **Kassenbuch** → **Neue Buchung**
2. Laden Sie einen Beleg hoch oder scannen Sie mit der Kamera
3. Die KI sollte den Beleg analysieren und die Daten automatisch ausfüllen

## Fehlerbehebung

Falls weiterhin Fehler auftreten:

1. **"Bucket not found"**: Bucket wurde nicht korrekt erstellt
   - Überprüfen Sie unter Storage → Buckets, ob `receipts` existiert

2. **"Permission denied"**: RLS Policies fehlen oder sind fehlerhaft
   - Überprüfen Sie die Policies unter Storage → receipts → Policies
   - Stellen Sie sicher, dass alle 4 Policies vorhanden sind

3. **"Invalid file type"**: Falsches Dateiformat
   - Nur JPG, PNG und PDF werden unterstützt
   - Überprüfen Sie die allowed_mime_types im Bucket

## Sicherheitshinweise

- Der Bucket ist **privat** (nicht öffentlich zugänglich)
- Jeder Tenant kann nur seine eigenen Belege sehen und hochladen
- Dateien werden organisiert nach: `tenant_id/year/month/filename`
- Maximale Dateigröße: 10 MB
