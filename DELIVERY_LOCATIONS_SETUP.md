# Lieferorte-Feature aktivieren - Schritt-für-Schritt

**Datum:** 2. Oktober 2025
**Dauer:** ~2 Minuten

---

## 🎯 Schnellanleitung

Die Migration wurde bereits im Projekt vorbereitet. Sie müssen sie nur noch in Ihrer Supabase-Datenbank ausführen.

---

## ✅ Schritt 1: Migration ausführen (2 Minuten)

### Option A: Über SQL Editor (empfohlen)

1. **Öffnen Sie Ihr Supabase Dashboard**
   - Gehen Sie zu: https://supabase.com/dashboard
   - Wählen Sie Ihr Projekt aus

2. **SQL Editor öffnen**
   - Klicken Sie in der linken Seitenleiste auf **"SQL Editor"**
   - Klicken Sie auf **"New query"**

3. **Migration ausführen**
   - Öffnen Sie die Datei: `MANUAL_MIGRATION_DELIVERY_LOCATIONS.sql`
   - Kopieren Sie den gesamten Inhalt (Ctrl+A, Ctrl+C)
   - Fügen Sie ihn in den SQL Editor ein (Ctrl+V)
   - Klicken Sie auf **"Run"** (oder drücken Sie Cmd/Ctrl + Enter)

4. **Erfolg überprüfen**
   - ✅ Sie sollten sehen: "Success. No rows returned"
   - ✅ Gehen Sie zu **Table Editor** → Sie sollten jetzt `delivery_locations` sehen

### Option B: Über Supabase CLI

```bash
# Falls Sie die CLI installiert haben
supabase db push
```

---

## 🧪 Schritt 2: Funktion testen (1 Minute)

1. **Anwendung öffnen**
   - Starten Sie: `npm run dev`
   - Öffnen Sie: http://localhost:5173

2. **Einloggen**
   - E-Mail: juergen.rosskamp@gmail.com
   - Passwort: Password123456!

3. **Lieferorte aufrufen**
   - Klicken Sie in der Navigation auf **"Lieferorte"**
   - Oder gehen Sie direkt zu: http://localhost:5173/delivery-locations

4. **Ersten Lieferort erstellen**
   - Klicken Sie auf **"Neuer Lieferort"**
   - Wählen Sie einen bestehenden Kunden (z.B. "Müller & Partner GmbH")
   - Füllen Sie die Felder aus:
     ```
     Bezeichnung: Baustelle Berlin-Mitte
     Adresse: Alexanderplatz 1
     PLZ: 10178
     Ort: Berlin
     ```
   - Klicken Sie **"Erstellen"**

5. **Erfolg prüfen**
   - ✅ Der Lieferort erscheint in der Liste
   - ✅ Lieferort-Nummer wurde automatisch generiert (z.B. K-001-001)
   - ✅ Klicken Sie auf "In Karten öffnen" → Google Maps öffnet sich

---

## ❓ Fehlerbehebung

### Fehler: "Could not find the table 'public.delivery_locations'"

**Ursache:** Migration wurde noch nicht ausgeführt

**Lösung:**
1. Führen Sie Schritt 1 erneut aus
2. Stellen Sie sicher, dass Sie den **gesamten SQL-Code** kopiert haben
3. Überprüfen Sie in Supabase → Table Editor, ob die Tabelle erscheint

---

### Fehler: "Failed to fetch customers"

**Ursache:** Keine Kunden in der Datenbank

**Lösung:**
1. Gehen Sie zu `/customers`
2. Erstellen Sie einen Testkunden
3. Gehen Sie dann zurück zu `/delivery-locations`

---

### Fehler: "RPC function not found: generate_next_location_number"

**Ursache:** SQL-Funktion wurde nicht erstellt

**Lösung:**
1. Führen Sie die Migration erneut aus (Schritt 1)
2. Stellen Sie sicher, dass der **komplette SQL-Code** ausgeführt wurde
3. Überprüfen Sie in SQL Editor:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'generate_next_location_number';
   ```
   Ergebnis sollte 1 Zeile zeigen

---

### Die Seite lädt, aber zeigt keine Daten

**Ursache:** Normale Situation - noch keine Lieferorte erstellt

**Lösung:**
1. Klicken Sie auf **"Neuer Lieferort"**
2. Erstellen Sie Ihren ersten Lieferort
3. Die Liste wird dann gefüllt

---

## ✅ Erfolg-Checkliste

Wenn alles funktioniert, können Sie:

- [x] Die Seite `/delivery-locations` aufrufen
- [x] Einen neuen Lieferort erstellen
- [x] Die automatische Nummerierung sehen (z.B. K-001-001)
- [x] Den Lieferort bearbeiten
- [x] Den Lieferort in Google Maps öffnen
- [x] Den Lieferort aktivieren/deaktivieren
- [x] Den Lieferort löschen

---

## 🚀 Nächste Schritte

Nach erfolgreicher Einrichtung:

1. **Mehrere Lieferorte erstellen**
   - Erstellen Sie 2-3 Lieferorte für denselben Kunden
   - Prüfen Sie die automatische Nummerierung

2. **GPS-Koordinaten testen**
   - Fügen Sie GPS-Koordinaten hinzu
   - Klicken Sie "In Karten öffnen"

3. **Lieferhinweise hinterlegen**
   - Fügen Sie Lieferhinweise hinzu
   - Fügen Sie Zugangsnotizen hinzu (z.B. Torcodes)

4. **Integration mit Rechnungen** (in Zukunft)
   - Bei der Rechnungserstellung kann dann ein Lieferort ausgewählt werden

---

## 📚 Weitere Dokumentation

- **Vollständige Feature-Dokumentation:** `DELIVERY_LOCATIONS_FEATURE.md`
- **Migrations-Datei:** `supabase/migrations/20251002100000_add_delivery_locations.sql`
- **React-Komponente:** `src/pages/DeliveryLocationsPage.tsx`
- **TypeScript-Types:** `src/types/index.ts`

---

## 💡 Schnell-Tipps

### Lieferort-Nummerierung verstehen
```
Format: KUNDENNUMMER-XXX

Beispiele:
K-001-001  → Erster Lieferort von Kunde K-001
K-001-002  → Zweiter Lieferort von Kunde K-001
K-002-001  → Erster Lieferort von Kunde K-002
```

### SQL-Abfragen zum Testen

```sql
-- Alle Lieferorte mit Kundenname anzeigen
SELECT
  dl.location_number,
  dl.name,
  c.display_name as customer,
  dl.city,
  dl.is_active
FROM delivery_locations dl
JOIN customers c ON c.id = dl.customer_id
ORDER BY dl.created_at DESC;

-- Anzahl Lieferorte pro Kunde
SELECT
  c.display_name,
  COUNT(dl.id) as anzahl_lieferorte
FROM customers c
LEFT JOIN delivery_locations dl ON dl.customer_id = c.id
GROUP BY c.id, c.display_name
ORDER BY anzahl_lieferorte DESC;
```

---

**Fertig!** 🎉

Bei weiteren Fragen schauen Sie in die Datei `DELIVERY_LOCATIONS_FEATURE.md`.
