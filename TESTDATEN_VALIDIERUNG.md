# ✅ Testdaten-Script Validierung

## Script: `reset_and_create_test_data.sql`

### Durchgeführte Validierungen:

#### 1. Tabellenstrukturen geprüft ✅
- **customers**: `default_payment_terms` (nicht `payment_terms`) ✅
- **invoices**: `customer_snapshot` (NOT NULL), `total_vat` (nicht `vat_amount`) ✅
- **invoice_items**: `net_amount`, `total_amount`, `delivery_location_id` ✅
- **quotes**: `created_by` REFERENCES `auth.users(id)` ✅
- **receipt_uploads**: Korrekte Tabelle (nicht `receipts`) ✅
- **cashbook_entries**: `created_by` (NOT NULL), `receipt_id` ✅
- **delivery_notes**: `assigned_vehicle_id`, `delivery_notes` ✅

#### 2. Verknüpfungen validiert ✅
- Rechnungen → Rechnungspositionen ✅
- Rechnungen → Zahlungen (für bezahlte/teilbezahlte) ✅
- Rechnungen → Lieferorte (50% der Rechnungen) ✅
- Lieferscheine → Rechnungen, Kunden, Lieferorte, Fahrzeuge ✅
- Kassenbuch → Belege (receipt_uploads) ✅
- Artikel → Kundenpreise ✅
- Artikel → Lieferortpreise ✅
- Artikel → Mengenstaffeln ✅
- Kunden → Lieferorte ✅

#### 3. Datenintegrität sichergestellt ✅
- Alle NOT NULL Felder werden befüllt ✅
- Foreign Keys sind korrekt ✅
- Customer Snapshots als JSONB gespeichert ✅
- Status-Felder verwenden gültige Werte ✅
- Berechnungen (Summen, MwSt) sind korrekt ✅

#### 4. Realistische Testdaten ✅
- **20 Kunden**: Mix aus B2B/B2C, aktiv/inaktiv
- **30 Artikel**: Verschiedene Kategorien, MwSt-Sätze (7%/19%)
- **15 Lieferorte**: Mit GPS, Zugangsnotizen, Anlieferzeiten
- **~50 Kundenpreise**: Mit Mengenstaffeln
- **~20 Lieferortpreise**: Baustellenspezifisch
- **~30 Mengenstaffeln**: 3 Staffeln pro Artikel
- **5 Fahrzeuge**: LKW, Transporter, Anhänger
- **30 Rechnungen**: Mit 2-7 Positionen, verschiedene Status
- **25 Lieferscheine**: Verknüpft mit allem
- **15 Angebote**: Verschiedene Status
- **40 Kassenbuch**: Mit Hash-Kette
- **10 Belege**: Mit OCR-Status

### Verwendung:

1. Öffne **Supabase SQL Editor**
2. Kopiere den Inhalt von `reset_and_create_test_data.sql`
3. Führe aus
4. Überprüfe die Ausgabe auf Fehler

### Ergebnis:
```
✅ Alle Daten vollständig verknüpft!
📊 ~400+ Datensätze erstellt
⏱️ Ausführungszeit: ~5-10 Sekunden
```

### Besonderheiten:

- **Löschen**: In korrekter Reihenfolge (Foreign Keys beachtet)
- **Fehlerbehandlung**: `EXCEPTION WHEN unique_violation` bei Preis-Duplikaten
- **Ausgabe**: Detaillierte RAISE NOTICE Meldungen
- **Statistik**: Komplette Übersicht am Ende
