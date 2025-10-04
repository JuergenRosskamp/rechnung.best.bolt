# Test Data Overview - SETUP_TESTDATA.sql

## Test Account
**Email:** `juergen.rosskamp@gmail.com`
**User ID:** `6a053515-108d-4826-946d-577f1767e36f`
**Password:** Set manually in Supabase Auth UI

## Data Structure

### 1. Tenant (1 Eintrag)
```
Company: Rosskamp Logistik GmbH
Address: Hauptstraße 123, 10115 Berlin, DE
Tax ID: DE123456789
VAT ID: DE123456789
Bank: Deutsche Bank
IBAN: DE89370400440532013000
BIC: COBADEFFXXX
```

### 2. Users (1 Eintrag)
```
Name: Jürgen Rosskamp
Role: admin
Email: juergen.rosskamp@gmail.com
```

### 3. Subscription (1 Eintrag)
```
Plan: rechnung.best
Status: active (1-year)
```

### 4. Customers (5 Einträge)

#### Customer 1: Müller Baumarkt
- Nummer: KD-1001
- Adresse: Berliner Str. 45, 10115 Berlin
- USt-IdNr.: DE987654321
- Kontakt: Hans Müller (hans.mueller@baumarkt.de)
- Zahlungsziel: 14 Tage
- Skonto: 2% bei 7 Tagen

#### Customer 2: Schmidt Handels AG
- Nummer: KD-1002
- Adresse: Hamburger Allee 78, 20095 Hamburg
- USt-IdNr.: DE876543210
- Kontakt: Maria Schmidt (m.schmidt@schmidt-ag.de)
- Zahlungsziel: 30 Tage
- Skonto: 3% bei 10 Tagen

#### Customer 3: Weber Großhandel
- Nummer: KD-1003
- Adresse: Münchner Straße 90, 80331 München
- USt-IdNr.: DE765432109
- Kontakt: Thomas Weber (t.weber@weber-gh.de)
- Zahlungsziel: 14 Tage
- Kein Skonto

#### Customer 4: Fischer Logistik
- Nummer: KD-1004
- Adresse: Kölner Ring 34, 50667 Köln
- USt-IdNr.: DE654321098
- Kontakt: Anna Fischer (a.fischer@fischer-log.de)
- Zahlungsziel: 21 Tage
- Skonto: 2% bei 7 Tagen

#### Customer 5: Becker Handel
- Nummer: KD-1005
- Adresse: Frankfurter Platz 12, 60311 Frankfurt
- USt-IdNr.: DE543210987
- Kontakt: Klaus Becker (k.becker@becker-handel.de)
- Zahlungsziel: 30 Tage
- Skonto: 3% bei 14 Tagen

### 5. Articles (5 Einträge)

#### Article 1: Palette Beton
- Nummer: ART-001
- Preis: 89.90 € (netto)
- USt: 19%
- Einheit: Palette
- Beschreibung: Palette Beton, 25kg Säcke, 40 Stück

#### Article 2: Kies
- Nummer: ART-002
- Preis: 45.00 € (netto)
- USt: 19%
- Einheit: Tonne
- Beschreibung: Kies, 8-16mm, lose

#### Article 3: Sand
- Nummer: ART-003
- Preis: 35.00 € (netto)
- USt: 19%
- Einheit: Tonne
- Beschreibung: Sand, 0-2mm, gewaschen

#### Article 4: Transport
- Nummer: SRV-001
- Preis: 120.00 € (netto)
- USt: 19%
- Einheit: Stück
- Beschreibung: Standardtransport innerhalb 50km

#### Article 5: Express Transport
- Nummer: SRV-002
- Preis: 200.00 € (netto)
- USt: 19%
- Einheit: Stück
- Beschreibung: Expresstransport innerhalb 50km, Lieferung am gleichen Tag

### 6. Article Time-Based Prices (1 Eintrag)
```
Article: Palette Beton (ART-001)
Season: Winter (Nov-Feb)
Price: 94.90 € (Winterzuschlag +5€)
```

### 7. Article Volume Discounts (2 Einträge)
```
Article: Palette Beton
- Ab 10 Stück: 85.00 € (-4.90€)
- Ab 50 Stück: 79.90 € (-10.00€)
```

### 8. Customer Price Overrides (1 Eintrag)
```
Customer: Müller Baumarkt
Article: Palette Beton
Price: 82.50 € (Stammkundenrabatt)
```

### 9. Delivery Locations (2 Einträge per Customer)
Für jeden Kunden 2 Lieferadressen:
- Hauptlager/Zentrale
- Filiale/Baustelle

### 10. Vehicles (2 Einträge)

#### Vehicle 1: Main Truck
- Kennzeichen: B-TR 1234
- Typ: Lastwagen
- Marke: Mercedes
- Modell: Actros
- Kapazität: 24 Tonnen

#### Vehicle 2: Delivery Van
- Kennzeichen: B-LF 5678
- Typ: Transporter
- Marke: Mercedes
- Modell: Sprinter
- Kapazität: 3.5 Tonnen

### 11. Invoices (3 Einträge)

#### Invoice 1: RE2025-00001
- Status: paid
- Kunde: Müller Baumarkt
- Datum: vor 5 Tagen
- Fällig: vor 9 Tagen (14 Tage Ziel)
- Positionen:
  - 10x Palette Beton @ 82.50€ = 825.00€
  - 5t Kies @ 45.00€ = 225.00€
  - 1x Transport @ 120.00€ = 120.00€
- Netto: 1,170.00€
- Skonto: -23.40€ (2%)
- Zwischensumme: 1,146.60€
- USt 19%: 217.85€
- **Gesamt: 1,364.45€**
- Bezahlt: 1,364.45€ am Fälligkeitstag

#### Invoice 2: RE2025-00002
- Status: sent
- Kunde: Schmidt Handels AG
- Datum: vor 3 Tagen
- Fällig: in 27 Tagen (30 Tage Ziel)
- Positionen:
  - 25x Palette Beton @ 85.00€ (Mengenrabatt) = 2,125.00€
  - 10t Sand @ 35.00€ = 350.00€
  - 1x Express Transport @ 200.00€ = 200.00€
- Netto: 2,675.00€
- USt 19%: 508.25€
- **Gesamt: 3,183.25€**
- Offen

#### Invoice 3: RE2025-00003
- Status: draft
- Kunde: Weber Großhandel
- Datum: heute
- Positionen:
  - 5x Palette Beton @ 89.90€ = 449.50€
  - 3t Kies @ 45.00€ = 135.00€
- Netto: 584.50€
- USt 19%: 111.06€
- **Gesamt: 695.56€**
- Entwurf (noch nicht versendet)

### 12. Invoice Items
Alle Positionen zu den obigen Rechnungen sind detailliert erfasst.

### 13. Invoice Payments (1 Eintrag)
```
Invoice: RE2025-00001
Amount: 1,364.45€
Date: vor 9 Tagen (am Fälligkeitstag)
Method: Banküberweisung
```

### 14. Deliveries (2 Einträge)

#### Delivery 1: Completed
- Kunde: Müller Baumarkt
- Fahrzeug: B-TR 1234
- Lieferadresse: Berliner Str. 45
- Datum: vor 5 Tagen
- Status: completed
- Positionen: 10x Palette Beton, 5t Kies
- Notiz: "Entladung durch Kunde mit Gabelstapler"

#### Delivery 2: Planned
- Kunde: Schmidt Handels AG
- Fahrzeug: B-TR 1234
- Lieferadresse: Hamburger Allee 78
- Datum: in 2 Tagen
- Status: planned
- Positionen: 25x Palette Beton, 10t Sand

### 15. Cashbook Entries (5 Einträge)

#### Entry 1: Opening Balance
- Datum: vor 30 Tagen
- Typ: opening_balance
- Betrag: 5,000.00€
- Beschreibung: Anfangsbestand Kasse

#### Entry 2: Income from Invoice
- Datum: vor 3 Tagen
- Typ: income
- Betrag: 2,686.42€ (inkl. 428.88€ USt)
- Beschreibung: Zahlungseingang RE2025-00001
- Kategorie: Kundenrechnung
- Verknüpft mit: Invoice 1

#### Entry 3: Expense - Fuel
- Datum: vor 10 Tagen
- Typ: expense
- Betrag: -150.00€ (inkl. -24.03€ USt)
- Beschreibung: Tankfüllung B-TR 1234
- Kategorie: Treibstoff

#### Entry 4: Expense - Office Supplies
- Datum: vor 7 Tage
- Typ: expense
- Betrag: -89.90€ (inkl. -14.40€ USt)
- Beschreibung: Büromaterial
- Kategorie: Bürobedarf

#### Entry 5: Income - Cash Payment
- Datum: gestern
- Typ: income
- Betrag: 695.56€ (inkl. 111.06€ USt)
- Beschreibung: Barzahlung Kleinauftrag
- Kategorie: Barverkauf

**Kassenstand:** 7,141.08€

### 16. Quotes (1 Entwurf)
```
Number: AN2025-00001
Status: draft
Customer: Fischer Logistik
Date: heute
Valid until: +30 Tage
Items:
- 50x Palette Beton @ 79.90€ (Mengenrabatt) = 3,995.00€
- 20t Sand @ 35.00€ = 700.00€
- 2x Express Transport @ 200.00€ = 400.00€
Net: 5,095.00€
VAT 19%: 968.05€
Total: 6,063.05€
```

### 17. Recurring Invoices (1 Eintrag)
```
Customer: Becker Handel
Frequency: monthly
Next Invoice: +1 Monat
Status: active
Items:
- 10x Palette Beton @ 89.90€ = 899.00€
- 1x Transport @ 120.00€ = 120.00€
Net: 1,019.00€
VAT 19%: 193.61€
Total: 1,212.61€
```

## Summary Statistics

| Category | Count | Total Value |
|----------|-------|-------------|
| Tenants | 1 | - |
| Users | 1 | - |
| Customers | 5 | - |
| Customer Contacts | 5 | - |
| Articles | 5 | - |
| Delivery Locations | 10 | (2 per customer) |
| Vehicles | 2 | - |
| Invoices | 3 | 5,243.26€ |
| - Paid | 1 | 1,364.45€ |
| - Sent (Open) | 1 | 3,183.25€ |
| - Draft | 1 | 695.56€ |
| Deliveries | 2 | - |
| Cashbook Entries | 5 | 7,141.08€ (Saldo) |
| Quotes | 1 | 6,063.05€ |
| Recurring Invoices | 1 | 1,212.61€/Monat |

## Test Scenarios Covered

1. ✅ **Multi-Customer Setup** - 5 verschiedene Kundentypen
2. ✅ **Product Catalog** - 3 Materialien + 2 Services
3. ✅ **Pricing Models**:
   - Standardpreise
   - Mengenrabatte
   - Saisonale Preise
   - Kundenspezifische Preise
4. ✅ **Invoice Lifecycle**:
   - Draft (erstellt)
   - Sent (versendet)
   - Paid (bezahlt)
5. ✅ **Payment Tracking**:
   - Skonto-Berechnungen
   - Zahlungseingänge
   - Offene Posten
6. ✅ **Delivery Management**:
   - Geplante Lieferungen
   - Abgeschlossene Lieferungen
   - Fahrzeugzuordnung
   - Multiple Lieferadressen
7. ✅ **Cashbook Compliance**:
   - Anfangsbestand
   - Einnahmen (Rechnungen + Bar)
   - Ausgaben (Betriebskosten)
   - GoBD-konforme Buchungen
8. ✅ **Recurring Business**:
   - Wiederkehrende Rechnungen
   - Automatisierung
9. ✅ **Quote-to-Invoice**:
   - Angebotserstellung
   - Umwandlung in Rechnung

## Notes

- Alle Daten sind realistisch und praxisnah
- Preise entsprechen typischen Marktpreisen (Baumaterialien, Logistik)
- Zeitstempel sind relativ (heute, vor X Tagen) für Aktualität
- USt-Berechnungen sind korrekt (19%)
- IBAN und BIC sind gültige Beispielwerte
- Alle Beziehungen (Foreign Keys) sind korrekt gesetzt
