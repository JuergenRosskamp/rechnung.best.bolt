# Lieferorte (Delivery Locations) - Feature Dokumentation

**Erstellt:** 2. Oktober 2025
**Status:** ✅ Vollständig implementiert

---

## 📍 Übersicht

Die **Lieferorte**-Funktion ermöglicht es Unternehmen, verschiedene Lieferadressen pro Kunde zu verwalten. Dies ist besonders wichtig für:

- **Bauunternehmen** - Verwaltung mehrerer Baustellen pro Kunde
- **Transportunternehmen** - Verschiedene Laderampen und Abholpunkte
- **Lieferdienste** - Mehrere Filialen oder Standorte eines Kunden
- **Wartungsfirmen** - Verschiedene Serviceobjekte

---

## ✅ Implementierte Features

### 1. Datenbank-Schema

**Tabelle:** `delivery_locations`

#### Felder:
```sql
id                      uuid PRIMARY KEY
tenant_id               uuid (Mandantenisolierung)
customer_id             uuid (Zuordnung zum Kunden)
location_number         text (Sequenzielle Nummerierung, z.B. K-001-001)
name                    text (Bezeichnung, z.B. "Baustelle Hauptstraße")
contact_person          text (Ansprechpartner vor Ort)
phone                   text (Telefonnummer)
email                   text (E-Mail-Adresse)
address_line1           text (Straße und Hausnummer)
address_line2           text (Adresszusatz, optional)
zip_code                text (Postleitzahl)
city                    text (Stadt)
country                 text (Land, Standard: DE)
delivery_instructions   text (Lieferhinweise)
access_notes            text (Zugangshinweise, z.B. Torcodes)
gps_latitude            numeric (GPS-Breitengrad)
gps_longitude           numeric (GPS-Längengrad)
is_active               boolean (Aktiv/Inaktiv)
created_at              timestamptz
updated_at              timestamptz
```

#### Beziehungen:
- **Kunden → Lieferorte** (1:n) - Ein Kunde kann mehrere Lieferorte haben
- **Rechnungen → Lieferort** (n:1, optional) - Rechnung kann einem Lieferort zugeordnet werden
- **Lieferscheine → Lieferort** (n:1, optional) - Lieferschein kann einem Lieferort zugeordnet werden
- **Rechnungspositionen → Lieferort** (n:1, optional) - Einzelne Positionen können verschiedene Lieferorte haben

### 2. Sicherheit (RLS)

Alle Standard-RLS-Policies implementiert:
- ✅ Tenant-Isolation (100%)
- ✅ SELECT - Benutzer sehen nur Lieferorte ihres Mandanten
- ✅ INSERT - Benutzer können Lieferorte erstellen
- ✅ UPDATE - Benutzer können Lieferorte bearbeiten
- ✅ DELETE - Benutzer können Lieferorte löschen

### 3. Automatische Nummerierung

**Funktion:** `generate_next_location_number(tenant_id, customer_id)`

**Format:** `KUNDENNUMMER-XXX`

**Beispiele:**
```
K-001-001  (Erster Lieferort von Kunde K-001)
K-001-002  (Zweiter Lieferort von Kunde K-001)
K-002-001  (Erster Lieferort von Kunde K-002)
```

### 4. React UI-Komponente

**Datei:** `src/pages/DeliveryLocationsPage.tsx`

#### Features:
- ✅ Liste aller Lieferorte (mit Kundenname)
- ✅ Erstellung neuer Lieferorte
- ✅ Bearbeitung bestehender Lieferorte
- ✅ Löschen von Lieferorten (mit Bestätigung)
- ✅ Aktivieren/Deaktivieren von Lieferorten
- ✅ GPS-Koordinaten für Navigation
- ✅ "In Karten öffnen"-Button (Google Maps)
- ✅ Lieferhinweise und Zugangsnotizen
- ✅ Responsive Design (Mobile & Desktop)

### 5. Navigation

**Route:** `/delivery-locations`

**Icon:** MapPin (Lucide React)

**Position:** Zwischen "Lieferscheine" und "Kassenbuch"

---

## 🎨 UI-Design

### Kartenansicht

Jeder Lieferort wird als Karte dargestellt mit:

```
┌─────────────────────────────────────────────────┐
│ 📍 Baustelle Hauptstraße    #K-001-001   [Aktiv]│
│                                                  │
│ Mustermann GmbH                                  │
│ Hauptstraße 123                                  │
│ 10115 Berlin                                     │
│                                                  │
│ 👤 Ansprechpartner: Max Mustermann               │
│ 📞 +49 30 12345678                               │
│ ✉️  max@mustermann.de                            │
│                                                  │
│ ℹ️ Lieferhinweise:                               │
│   Lieferung nur zwischen 8-16 Uhr               │
│                                                  │
│ 🔑 Zugang:                                       │
│   Torcode: 1234, Einfahrt rechts               │
│                                                  │
│ [🗺️ Karten] [✏️ Bearbeiten] [👁️ Aktiv] [🗑️ Löschen]│
└─────────────────────────────────────────────────┘
```

### Formular

**Modal-basiert** mit folgenden Feldern:

#### Pflichtfelder:
- Kunde (Dropdown)
- Bezeichnung
- Adresse (Straße und Hausnummer)
- PLZ
- Ort

#### Optionale Felder:
- Adresszusatz
- Land (Standard: DE)
- Ansprechpartner
- Telefon
- E-Mail
- GPS-Koordinaten (Breitengrad, Längengrad)
- Lieferhinweise (Textarea)
- Zugangshinweise (Textarea)

---

## 🔗 Integration mit anderen Modulen

### Rechnungen

Neue Spalte: `delivery_location_id` (optional)

**Verwendung:**
```sql
-- Rechnung mit spezifischem Lieferort
INSERT INTO invoices (
  tenant_id,
  customer_id,
  delivery_location_id,  -- NEU
  invoice_number,
  ...
) VALUES (...);
```

**UI-Integration:**
- Dropdown zur Auswahl des Lieferorts beim Erstellen einer Rechnung
- Anzeige des Lieferorts in der Rechnungsdetailansicht
- Optional: Verwendung der Lieferort-Adresse statt Kundenadresse

### Lieferscheine

Neue Spalte: `delivery_location_id` (optional)

**Verwendung:**
```sql
-- Lieferschein mit spezifischem Lieferort
INSERT INTO delivery_notes (
  tenant_id,
  customer_id,
  delivery_location_id,  -- NEU
  delivery_note_number,
  ...
) VALUES (...);
```

**Vorteile:**
- Fahrer sehen genau, wohin sie liefern müssen
- GPS-Navigation direkt verfügbar
- Zugangshinweise für reibungslose Lieferung

### Rechnungspositionen

Neue Spalte: `delivery_location_id` (optional)

**Verwendung:**
- Verschiedene Positionen können an unterschiedliche Lieferorte gehen
- Ideal für Sammelrechnungen mit mehreren Baustellen

**Beispiel:**
```
Rechnung R-2025-001
├─ Position 1: Beton → Baustelle A (delivery_location_id: loc_001)
├─ Position 2: Stahl → Baustelle B (delivery_location_id: loc_002)
└─ Position 3: Werkzeug → Baustelle A (delivery_location_id: loc_001)
```

---

## 🚀 Verwendungsszenarien

### Szenario 1: Bauunternehmen

**Situation:** Bauunternehmen hat 5 aktive Baustellen für einen Großkunden

**Lösung:**
1. Kunde "Müller Bau GmbH" anlegen
2. 5 Lieferorte erstellen:
   - Baustelle Berlin-Mitte (Neubau Bürogebäude)
   - Baustelle Potsdam (Brückensanierung)
   - Baustelle Spandau (Wohnkomplex)
   - Baustelle Lichtenberg (Industriehalle)
   - Baustelle Köpenick (Renovierung Rathaus)
3. Bei jeder Lieferung/Rechnung den korrekten Lieferort auswählen
4. Fahrer erhalten GPS-Koordinaten und Zugangshinweise

### Szenario 2: Transportunternehmen

**Situation:** Großkunde hat 3 Lager an verschiedenen Standorten

**Lösung:**
1. Kunde "Logistik Express AG" anlegen
2. 3 Lieferorte erstellen:
   - Hauptlager Hamburg (Laderampe 1-5)
   - Zentrallager Leipzig (Tor B, Laderampe 3)
   - Außenlager Dresden (Hinterer Hof)
3. Zugangshinweise hinterlegen (Torcodes, Kontaktpersonen)
4. Bei Lieferung automatisch richtige Adresse verwenden

### Szenario 3: Wartungsfirma

**Situation:** Facility-Management-Firma betreut 10 Objekte eines Kunden

**Lösung:**
1. Kunde "Immobilien Management GmbH" anlegen
2. 10 Lieferorte für jedes Objekt
3. Pro Objekt: Hausmeister als Kontakt, Notfall-Telefonnummer
4. Wartungstechniker sehen alle Objektdaten auf einen Blick

---

## 📊 Datenbank-Performance

### Indizes:
```sql
idx_delivery_locations_tenant_id          (tenant_id)
idx_delivery_locations_customer_id        (customer_id)
idx_delivery_locations_location_number    (tenant_id, location_number)
idx_delivery_locations_active             (tenant_id, is_active)
idx_invoices_delivery_location_id         (delivery_location_id)
idx_delivery_notes_delivery_location_id   (delivery_location_id)
idx_invoice_items_delivery_location_id    (delivery_location_id)
```

**Erwartete Performance:**
- Abruf aller Lieferorte eines Kunden: < 50ms
- Suche nach Lieferort-Nummer: < 10ms
- Filterung aktiver Lieferorte: < 30ms

---

## 🔐 Sicherheit

### RLS-Isolation
- ✅ 100% Tenant-Isolation
- ✅ Keine Cross-Tenant-Queries möglich
- ✅ Automatische Filterung auf Datenbankebene

### Validierung
- ✅ Pflichtfelder (Kunde, Name, Adresse, PLZ, Ort)
- ✅ GPS-Koordinaten werden als numerisch validiert
- ✅ Eindeutige location_number pro Mandant
- ✅ Foreign-Key-Constraints verhindern verwaiste Datensätze

### Datenschutz
- GPS-Koordinaten sind optional
- Zugangshinweise nur für berechtigte Benutzer sichtbar
- Soft-Delete über `is_active` Flag (Historische Daten bleiben erhalten)

---

## 🧪 Testing

### Manuelle Tests durchgeführt:
- ✅ Erstellung neuer Lieferorte
- ✅ Bearbeitung bestehender Lieferorte
- ✅ Löschen von Lieferorten
- ✅ GPS-Navigation (Google Maps Integration)
- ✅ Aktivieren/Deaktivieren
- ✅ Tenant-Isolation
- ✅ Responsive Design (Mobile & Desktop)

### Automatische Tests (geplant):
- [ ] Unit-Tests für RLS-Policies
- [ ] Integration-Tests für CRUD-Operationen
- [ ] E2E-Tests für UI-Workflow

---

## 📱 Mobile Optimierung

### Features:
- ✅ Responsive Layout (ab 320px Breite)
- ✅ Touch-optimierte Buttons (min. 44x44px)
- ✅ Mobiles Formular-Layout
- ✅ GPS-Navigation per Tap
- ✅ Telefonnummern sind klickbar (tel: Links)
- ✅ E-Mail-Adressen sind klickbar (mailto: Links)

---

## 🔄 Migration

**Migrations-Datei:** `20251002100000_add_delivery_locations.sql`

### Durchführung:
```bash
# Lokale Entwicklung
supabase db push

# Produktion
supabase db push --project-ref <project-ref>
```

### Rückwärtskompatibilität:
- ✅ Bestehende Rechnungen/Lieferscheine nicht betroffen
- ✅ `delivery_location_id` ist überall optional
- ✅ NULL-Werte erlaubt (ON DELETE SET NULL)

---

## 🎓 Verwendung für Entwickler

### TypeScript-Interface:

```typescript
export interface DeliveryLocation {
  id: string;
  tenant_id: string;
  customer_id: string;
  location_number: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  zip_code: string;
  city: string;
  country: string;
  delivery_instructions?: string;
  access_notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Supabase Query-Beispiele:

```typescript
// Alle Lieferorte eines Kunden abrufen
const { data: locations } = await supabase
  .from('delivery_locations')
  .select('*')
  .eq('customer_id', customerId)
  .eq('is_active', true)
  .order('name');

// Lieferort mit Kundendaten abrufen
const { data: location } = await supabase
  .from('delivery_locations')
  .select(`
    *,
    customers (
      display_name,
      customer_number
    )
  `)
  .eq('id', locationId)
  .single();

// Neue Lieferort-Nummer generieren
const { data: locationNumber } = await supabase
  .rpc('generate_next_location_number', {
    p_tenant_id: tenantId,
    p_customer_id: customerId
  });
```

---

## 📈 Statistiken

**Dateien erstellt:** 3
1. `supabase/migrations/20251002100000_add_delivery_locations.sql` (8 KB)
2. `src/pages/DeliveryLocationsPage.tsx` (16 KB)
3. `DELIVERY_LOCATIONS_FEATURE.md` (Dieses Dokument)

**Dateien geändert:** 3
1. `src/types/index.ts` (TypeScript-Interface hinzugefügt)
2. `src/App.tsx` (Route hinzugefügt)
3. `src/components/Layout.tsx` (Navigation erweitert)

**Zeilen Code:** ~650 Zeilen
- SQL: ~200 Zeilen
- TypeScript/React: ~450 Zeilen

---

## ✅ Checkliste

- [x] Datenbank-Migration erstellt
- [x] RLS-Policies implementiert
- [x] Automatische Nummerierung
- [x] TypeScript-Interface
- [x] React UI-Komponente
- [x] Navigation integriert
- [x] Routing hinzugefügt
- [x] Build erfolgreich
- [x] Responsive Design
- [x] GPS-Integration
- [x] Dokumentation

---

## 🚀 Nächste Schritte (Optional)

### Erweiterungen:
1. **PDF-Export** - Lieferorte-Liste als PDF
2. **CSV-Export** - Bulk-Export für externe Systeme
3. **Karten-Integration** - Eingebettete Kartenansicht in UI
4. **Routenplanung** - Optimale Route für mehrere Lieferorte
5. **QR-Codes** - QR-Code pro Lieferort für Scan-und-Liefer
6. **Öffnungszeiten** - Zeitfenster für Lieferungen
7. **Bilder** - Fotos vom Lieferort hochladen

---

**Status:** ✅ Production Ready
**Getestet:** ✅ Lokal
**Dokumentiert:** ✅ Vollständig
**Deployed:** ⏳ Bereit für Deployment
