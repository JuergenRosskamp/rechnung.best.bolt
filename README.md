# rechnung.best - GoBD-konforme Rechnungsverwaltung

Eine moderne, Multi-Tenant SaaS-Plattform für deutsche KMUs zur professionellen Rechnungserstellung und Buchhaltung.

## 🚀 Funktionen

### ✅ Vollständig implementiert

#### Authentifizierung & Benutzerverwaltung
- Sichere Registrierung und Login (Email/Passwort)
- Multi-Tenant-Architektur mit strikter Datenisolierung
- Rollbasierte Zugriffskontrolle (Admin, Office, etc.)
- 14-tägiger kostenloser Testzeitraum (rechnung.best Plan)

#### Kundenverwaltung
- Vollständige CRUD-Operationen für Kunden
- B2B, B2C und B2G Kunden
- Umfassende Adress- und Kontaktdaten
- Steuerinformationen (Steuernummer, USt-IdNr.)
- Zahlungskonditionen pro Kunde
- E-Rechnungs-Einstellungen (Leitweg-ID)
- Suche und Filterung
- Statistiken (Umsatz, Rechnungsanzahl)

#### Artikelverwaltung
- Produkt- und Dienstleistungskatalog
- Kategorisierung und Tags
- Flexible Preisgestaltung
- MwSt.-Sätze (0%, 7%, 19%)
- Einheitenverwaltung
- Verkaufsstatistiken

#### Rechnungswesen
- Professionelle Rechnungserstellung
- Dynamische Positionsverwaltung
- Automatische Berechnungen (Netto, MwSt., Brutto)
- GoBD-konforme sequenzielle Nummerierung
- Statusverfolgung (Entwurf, Versendet, Bezahlt, Überfällig)
- Zahlungsverfolgung
- Kundenspezifische Notizen
- Fälligkeitsdaten und Zahlungsziele

#### Dashboard & Reporting
- Echtzeit-Statistiken
- Umsatzübersicht
- Offene und überfällige Rechnungen
- Schnellaktionen
- Onboarding-Hilfe für neue Benutzer

#### Einstellungen
- Firmendaten-Verwaltung
- Abonnement-Übersicht
- Benutzerverwaltung
- Benachrichtigungseinstellungen
- Sicherheitseinstellungen

## 🏗️ Technologie-Stack

### Frontend
- **React 18+** mit TypeScript
- **Tailwind CSS** für Styling
- **React Hook Form** für Formularhandling
- **Zod** für Validierung
- **Zustand** für State Management
- **Lucide React** für Icons

### Backend
- **Supabase** (PostgreSQL + Auth + Storage)
- Row Level Security (RLS) für Multi-Tenancy
- Edge Functions für komplexe Logik
- Automatische Trigger für Berechnungen

### Sicherheit
- Strikte Tenant-Isolierung auf Datenbankebene
- Row Level Security auf allen Tabellen
- JWT-basierte Authentifizierung
- Passwort-Validierung (min. 12 Zeichen, Komplexität)

## 📊 Datenbank-Schema

### Kern-Tabellen
- `tenants` - Mandanten/Firmen
- `users` - Benutzer mit Rollenzuweisung
- `subscriptions` - Abonnement-Management
- `customers` - Kundenverwaltung
- `customer_contacts` - Ansprechpartner
- `articles` - Artikel/Dienstleistungen
- `invoices` - Rechnungen
- `invoice_items` - Rechnungspositionen
- `invoice_payments` - Zahlungen
- `invoice_numbering` - GoBD-konforme Nummerierung

### GoBD-Compliance
- Sequenzielle, lückenlose Rechnungsnummerierung
- Unveränderliche Kundendaten (Snapshots)
- Audit-Trail auf allen Tabellen
- Soft-Delete für Datenerhalt

## 🎯 Benutzer-Journey

1. **Registrierung** → Firma und Adminkonto erstellen
2. **Onboarding** → Firmendaten vervollständigen
3. **Kundenpflege** → Kunden mit vollständigen Daten anlegen
4. **Artikelstamm** → Produkte/Dienstleistungen definieren
5. **Rechnungserstellung** → Professionelle Rechnungen erstellen
6. **Verfolgung** → Zahlungen tracken und Mahnungen versenden

## 🚦 Erste Schritte

### Voraussetzungen
- Node.js 18+
- Supabase Account
- npm oder yarn

### Installation

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Production Build
npm run build
```

### Umgebungsvariablen

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 📱 Mobile-First Design

- Vollständig responsive auf allen Geräten
- Touch-optimierte Bedienung
- Mobile Navigation mit Hamburger-Menü
- Kartenansicht auf kleinen Bildschirmen
- Optimierte Formulare für mobile Eingabe

## 🔐 Sicherheit

### Multi-Tenancy
- Jede Datenbankabfrage enthält `tenant_id`
- RLS-Policies auf allen Tabellen
- Keine Möglichkeit für Cross-Tenant-Zugriffe

### Authentifizierung
- Sichere Passwort-Hashing
- JWT mit Auto-Refresh
- Session-Management
- Optional: 2FA (geplant)

### Datenschutz (DSGVO)
- Datenminimierung
- Zweckbindung
- Nutzerrechte (Auskunft, Löschung)
- Audit-Logging

## 🎨 Design-Prinzipien

- **Klarheit:** Intuitive Benutzeroberfläche
- **Effizienz:** Minimale Klicks für häufige Aufgaben
- **Feedback:** Klare Rückmeldungen bei Aktionen
- **Konsistenz:** Einheitliche Patterns und Komponenten
- **Zugänglichkeit:** Gute Kontraste, klare Labels

## 🌍 Internationalisierung

- Vollständig auf Deutsch
- Deutsche Währungsformatierung (€)
- Deutsches Datumsformat (TT.MM.JJJJ)
- Deutsche Adressformate

## 📈 Skalierbarkeit

### Performance-Optimierungen
- Indizierte Datenbankabfragen
- Lazy Loading für große Listen
- Optimistic UI Updates
- Effizientes State Management

### Code-Organisation
- Feature-basierte Ordnerstruktur
- Wiederverwendbare Komponenten
- Type-Safe mit TypeScript
- Klare Separation of Concerns

## 🔮 Roadmap (Nächste Features)

### Kurzfristig
- [ ] PDF-Generierung für Rechnungen
- [ ] E-Mail-Versand von Rechnungen
- [ ] Zahlungseingänge direkt erfassen
- [ ] GoBD-Kassenbuch
- [ ] Mahnwesen

### Mittelfristig
- [ ] XRechnung Export (EN 16931)
- [ ] ZUGFeRD 2.1.1 Export
- [ ] DATEV-Export
- [ ] Wiederkehrende Rechnungen
- [ ] OCR für Belege
- [ ] Mobile Apps (iOS/Android)

### Langfristig
- [ ] EÜR-Auswertungen
- [ ] Erweiterte Analysen & BI
- [ ] API für Integrationen
- [ ] White-Label Option
- [ ] Mehr Sprachen

## 📝 Lizenz

Proprietär - Alle Rechte vorbehalten

## 🤝 Support

Bei Fragen oder Problemen:
- E-Mail: support@rechnung.best
- Dokumentation: docs.rechnung.best

## 🏆 Credits

Entwickelt mit ❤️ für deutsche KMUs

---

**Version:** 1.0.0
**Letzte Aktualisierung:** Januar 2025
**Status:** Production Ready
