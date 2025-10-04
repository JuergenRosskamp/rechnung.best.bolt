# 🚀 Datenbank Setup - Schritt für Schritt

Diese Anleitung führt dich durch das komplette Setup der Datenbank mit Testdaten für **juergen.rosskamp@gmail.com**.

---

## 📋 Übersicht

1. **Schritt 1:** Datenbank-Schema erstellen
2. **Schritt 2:** Auth-Benutzer erstellen
3. **Schritt 3:** Testdaten einfügen
4. **Schritt 4:** Anmelden und loslegen

---

## 1️⃣ Schritt 1: Datenbank-Schema erstellen

### 1.1 Öffne Supabase SQL Editor

1. Gehe zu: https://0ec90b57d6e95fcbda19832f.supabase.co
2. Klicke in der linken Navigation auf **"SQL Editor"**
3. Klicke auf **"New Query"**

### 1.2 Schema anwenden

1. Öffne die Datei: **`SETUP_DATABASE.sql`**
2. Kopiere den **gesamten Inhalt**
3. Füge ihn in den SQL Editor ein
4. Klicke auf **"Run"** (oder drücke `Ctrl+Enter`)

⏱️ **Dauer:** ~5-10 Sekunden

✅ **Erfolg:** Du siehst mehrere grüne Meldungen wie:
```
Created tenant: ...
Created user profile
Created subscription
...
Database setup complete!
```

---

## 2️⃣ Schritt 2: Auth-Benutzer erstellen

### 2.1 Erstelle den Authentifizierungs-Benutzer

1. Gehe zu: **Authentication** > **Users** (in der linken Navigation)
2. Klicke auf: **"Add User"** (oben rechts)
3. Fülle das Formular aus:
   - **Email:** `juergen.rosskamp@gmail.com`
   - **Password:** (wähle ein sicheres Passwort, z.B. `TestPass123!`)
   - **Auto Confirm User:** ✅ **JA aktivieren!**
4. Klicke auf: **"Create User"**

### 2.2 Kopiere die User ID

1. Der neue Benutzer erscheint in der Liste
2. Klicke auf den Benutzer
3. Kopiere die **User ID** (UUID, z.B. `550e8400-e29b-41d4-a716-446655440000`)
4. **WICHTIG:** Behalte diese ID für Schritt 3!

---

## 3️⃣ Schritt 3: Testdaten einfügen

### 3.1 Bereite das Testdaten-Script vor

1. Öffne die Datei: **`SETUP_TESTDATA.sql`**
2. Suche nach der Zeile (ca. Zeile 24):
   ```sql
   v_user_id uuid := 'YOUR_AUTH_USER_ID'; -- REPLACE THIS
   ```
3. Ersetze `'YOUR_AUTH_USER_ID'` mit deiner kopierten User ID:
   ```sql
   v_user_id uuid := '550e8400-e29b-41d4-a716-446655440000';
   ```

### 3.2 Testdaten einfügen

1. Gehe zurück zum **SQL Editor** in Supabase
2. Klicke auf **"New Query"**
3. Kopiere den **gesamten Inhalt** von `SETUP_TESTDATA.sql` (mit deiner User ID!)
4. Füge ihn ein und klicke auf **"Run"**

⏱️ **Dauer:** ~2-3 Sekunden

✅ **Erfolg:** Du siehst:
```
TEST DATA CREATION COMPLETE
Tenant ID: ...
User: juergen.rosskamp@gmail.com
Customers: 5
Articles: 5
Vehicles: 2
Invoices: 3
...
```

---

## 4️⃣ Schritt 4: Anmelden und loslegen

### 4.1 Starte die Anwendung

```bash
npm run dev
```

### 4.2 Melde dich an

1. Öffne: http://localhost:5173
2. Klicke auf **"Login"**
3. Gib ein:
   - **Email:** `juergen.rosskamp@gmail.com`
   - **Password:** (das Passwort aus Schritt 2.1)
4. Klicke auf **"Anmelden"**

---

## 📊 Was ist jetzt in der Datenbank?

### ✅ Mandant (Tenant)
- **Firma:** Rosskamp Logistik GmbH
- **Adresse:** Hauptstraße 123, 10115 Berlin
- **Bankdaten:** IBAN, BIC konfiguriert

### ✅ Benutzer
- **Name:** Jürgen Rosskamp
- **Email:** juergen.rosskamp@gmail.com
- **Rolle:** Admin (volle Rechte)

### ✅ 5 Kunden
1. **Müller Baumarkt GmbH** (K-10001)
2. **Schmidt Handels AG** (K-10002)
3. **Weber Großhandel** (K-10003)
4. **Fischer Logistik GmbH** (K-10004)
5. **Becker Handel e.K.** (K-10005)

### ✅ 5 Artikel
1. **Palette Beton** (450 €/Stück) - mit Mengenrabatten!
2. **Kies** (85 €/Tonne)
3. **Sand** (65 €/Tonne)
4. **Lieferung Standard** (120 €)
5. **Expresslieferung** (250 €)

### ✅ 2 Fahrzeuge
1. **B-RK 1234** - Mercedes Actros LKW (18t)
2. **B-RK 5678** - Mercedes Sprinter (3,5t)

### ✅ 3 Rechnungen
1. **RE2025-00001** - ✅ Bezahlt (2.686,42 €)
2. **RE2025-00002** - 📤 Versendet (2.380,63 €) - mit Skonto!
3. **Entwurf** - 📝 In Bearbeitung (4.819,50 €)

### ✅ 2 Lieferungen
1. **LF-2025-001** - ✅ Abgeschlossen (5 Paletten Beton)
2. **LF-2025-002** - 📅 Geplant (Kies + Sand)

### ✅ Kassenbuch
- Anfangsbestand: 5.000 €
- 1 Einnahme (Rechnung bezahlt)
- 2 Ausgaben (Tankfüllung, Büromaterial)
- **Aktueller Stand:** ~7.446,52 €

### ✅ 1 Angebot
- **AN-2025-001** für Fischer Logistik

### ✅ 1 Support-Ticket
- Beispiel-Anfrage zur Mehrwertsteuer

---

## 🎯 Nächste Schritte

Nach dem Login kannst du sofort:

1. **Dashboard** ansehen - Übersicht aller Daten
2. **Rechnungen** erstellen - Neue Rechnung für Kunden
3. **Lieferungen** planen - Neue Auslieferung anlegen
4. **Kassenbuch** führen - Einnahmen/Ausgaben erfassen
5. **Artikel** verwalten - Preise & Rabatte anpassen
6. **Kunden** anlegen - Neue Geschäftspartner

---

## ❓ Häufige Probleme

### Problem: "Missing Supabase credentials"
**Lösung:** Prüfe ob `.env` Datei existiert und korrekte Werte enthält

### Problem: "User not found" beim Login
**Lösung:** Stelle sicher dass du in Schritt 2 den Auth-User erstellt hast

### Problem: "Permission denied" bei Testdaten
**Lösung:** Stelle sicher dass die User ID in `SETUP_TESTDATA.sql` korrekt ist

### Problem: Tabellen existieren bereits
**Lösung:** `SETUP_DATABASE.sql` löscht automatisch alte Tabellen

---

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfe die Browser-Konsole auf Fehler (F12)
2. Prüfe die Supabase Logs
3. Erstelle ein Support-Ticket im System

---

## 🎉 Fertig!

Die Datenbank ist jetzt vollständig eingerichtet mit realistischen Testdaten.

**Viel Erfolg mit rechnung.best!** 🚀
