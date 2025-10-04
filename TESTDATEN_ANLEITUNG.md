# 📋 Testdaten-Scripts - Anleitung

## ⚠️ WICHTIG: Voraussetzungen

**Bevor du die Scripts ausführst, MUSST du:**

1. **Einen User über die App registrieren/einloggen**
   - Gehe zu: `/register` oder `/login`
   - Erstelle einen Account oder logge dich ein
   - Dadurch wird automatisch ein Eintrag in `auth.users` erstellt

2. **Supabase SQL Editor öffnen**
   - Gehe zu: Supabase Dashboard → SQL Editor

## 📄 Verfügbare Scripts

### 1. `reset_and_create_test_data.sql` (KLEIN - 10/10/10)
**Empfohlen für:** Schnelle Tests, Development

Erstellt:
- 1 Tenant
- 10 Kunden
- 10 Artikel
- 3 Fahrzeuge
- 10 Rechnungen (~30 Positionen)
- 10 Kassenbuch-Einträge

**Ausführungszeit:** ~2-3 Sekunden

### 2. `reset_and_create_test_data_COMPREHENSIVE.sql` (GROSS - 20/30/30)
**Empfohlen für:** Production-Tests, Demo, QA

Erstellt:
- 1 Tenant
- 20 Kunden (B2B/B2C Mix)
- 30 Artikel (6 Kategorien)
- 15 Lieferorte (mit GPS)
- 60 Kundenpreise
- 30 Lieferortpreise
- 45 Mengenstaffeln
- 5 Fahrzeuge
- 30 Rechnungen (~120 Positionen)
- 20 Lieferscheine (mit Fotos)
- 15 Angebote
- 30 Kassenbuch-Einträge
- 10 Belege mit OCR

**Ausführungszeit:** ~5-8 Sekunden

## 🚀 Ausführung

### Schritt 1: Einloggen
```
1. Öffne die App
2. Gehe zu /login
3. Logge dich ein (oder registriere einen neuen Account)
```

### Schritt 2: Script ausführen
```
1. Öffne Supabase SQL Editor
2. Kopiere EINS der Scripts (klein ODER groß)
3. Füge ein und klicke "Run"
4. Warte auf Erfolgsmeldung
```

### Schritt 3: Verifizieren
```
1. Aktualisiere die App (F5)
2. Prüfe Dashboard
3. Öffne Kunden, Artikel, Rechnungen etc.
```

## ⚠️ Fehlerbehandlung

### Fehler: "Kein User gefunden!"
**Ursache:** Du bist nicht eingeloggt oder kein User in `auth.users`

**Lösung:**
1. Öffne die App
2. Registriere einen Account oder logge dich ein
3. Führe das Script erneut aus

### Fehler: "Foreign key violation"
**Ursache:** Abhängigkeiten zwischen Tabellen

**Lösung:** Das Script hat Fehlerbehandlung - sollte nicht passieren. Falls doch:
1. Führe das Script nochmal aus (DELETE Statements sind fehlertolerant)

### Fehler: "Table does not exist"
**Ursache:** Migrationen wurden nicht ausgeführt

**Lösung:**
1. Prüfe ob alle Migrationen in Supabase ausgeführt wurden
2. Das Script überspringt automatisch fehlende Tabellen

## 📊 Erwartete Ausgabe

```
╔════════════════════════════════════════════════════════════════════════╗
║           LÖSCHE ALTE DATEN UND ERSTELLE NEUE TESTDATEN               ║
╚════════════════════════════════════════════════════════════════════════╝

🗑️  Lösche alte Testdaten...
   ✓ invoice_items
   ✓ invoices
   ✓ customers
   ... etc ...

📝 Erstelle neue Testdaten...
   ✓ Tenant erstellt & User verknüpft
   ✓ 10 Kunden erstellt
   ✓ 10 Artikel erstellt
   ... etc ...

╔════════════════════════════════════════════════════════════════════════╗
║              ✅ TESTDATEN ERFOLGREICH ERSTELLT                        ║
╚════════════════════════════════════════════════════════════════════════╝

📊 ZUSAMMENFASSUNG:
   • Tenant: Musterbau GmbH
   • Kunden: 10
   • Artikel: 10
   ... etc ...

✅ Alle Daten vollständig verknüpft und einsatzbereit!
```

## 🔑 Wichtige Hinweise

1. **Die Scripts LÖSCHEN alle vorhandenen Daten!**
   - Nur in Development/Test-Umgebungen verwenden
   - NIEMALS in Production ausführen

2. **User-Verknüpfung:**
   - Das Script verwendet den ERSTEN User aus `auth.users`
   - Dieser wird als "Max Mustermann (Admin)" angelegt
   - Alle Datensätze werden diesem User zugeordnet

3. **Tenant:**
   - Es wird genau EIN Tenant erstellt: "Musterbau GmbH"
   - Alle Daten gehören zu diesem Tenant

4. **Mehrfache Ausführung:**
   - Du kannst die Scripts beliebig oft ausführen
   - Sie löschen alte Daten und erstellen neue
   - Idempotent (sicheres Wiederholen)

## 🎯 Wann welches Script?

| Situation | Script |
|-----------|--------|
| Schneller Test | `reset_and_create_test_data.sql` |
| Feature-Development | `reset_and_create_test_data.sql` |
| Demo vorbereiten | `reset_and_create_test_data_COMPREHENSIVE.sql` |
| QA Testing | `reset_and_create_test_data_COMPREHENSIVE.sql` |
| Alle Features testen | `reset_and_create_test_data_COMPREHENSIVE.sql` |

## ✅ Checkliste

- [ ] Ich habe einen Account erstellt/bin eingeloggt
- [ ] Ich habe das richtige Script gewählt (klein/groß)
- [ ] Ich bin im Supabase SQL Editor
- [ ] Ich habe verstanden, dass ALLE Daten gelöscht werden
- [ ] Ich bin NICHT in Production
- [ ] Ich habe das Script eingefügt
- [ ] Ich klicke auf "Run"

---

**Bei Problemen:** Siehe Fehlerbehandlung oben oder erstelle ein Support-Ticket.
