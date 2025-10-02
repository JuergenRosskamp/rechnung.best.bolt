# Stripe Integration für rechnung.best

## Übersicht

Diese Anleitung beschreibt, wie Sie Stripe in rechnung.best integrieren, um Abonnement-Zahlungen zu verarbeiten.

## Preispläne

rechnung.best bietet drei Preispläne:

### 1. basic_kasse - 4,90 €/Monat
- GoBD-konformes Kassenbuch
- Kassenzählungen
- Bargeldbuchungen
- E-Mail Support

### 2. basic_invoice - 9,90 €/Monat
- Unbegrenzte Rechnungen
- Kundenverwaltung
- Artikelverwaltung
- GoBD-konform
- E-Mail Support

### 3. rechnung.best - 12,90 €/Monat (Empfohlen)
- Alle Features inklusive
- Rechnungen & Kassenbuch
- Fuhrpark & Lieferungen
- Mehrstufige Preise
- Prioritäts-Support

## Einrichtungsschritte

### 1. Stripe Account erstellen

1. Registrieren Sie sich unter https://dashboard.stripe.com/register
2. Verifizieren Sie Ihr Konto (E-Mail, Geschäftsinformationen)
3. Aktivieren Sie Ihr Konto für Live-Zahlungen

### 2. Stripe Produkte anlegen

Erstellen Sie in Ihrem Stripe Dashboard unter "Produkte" drei wiederkehrende Produkte:

**Produkt 1: basic_kasse**
- Name: basic_kasse
- Preis: 4,90 € / Monat
- Abrechnungsintervall: Monatlich
- Notieren Sie die Price ID (z.B. `price_xxx`)

**Produkt 2: basic_invoice**
- Name: basic_invoice
- Preis: 9,90 € / Monat
- Abrechnungsintervall: Monatlich
- Notieren Sie die Price ID (z.B. `price_yyy`)

**Produkt 3: rechnung.best**
- Name: rechnung.best
- Preis: 12,90 € / Monat
- Abrechnungsintervall: Monatlich
- Notieren Sie die Price ID (z.B. `price_zzz`)

### 3. API Keys abrufen

1. Gehen Sie zu "Entwickler" > "API-Schlüssel"
2. Kopieren Sie den **Publishable Key** (beginnt mit `pk_`)
3. Kopieren Sie den **Secret Key** (beginnt mit `sk_`)

### 4. Webhook einrichten

1. Gehen Sie zu "Entwickler" > "Webhooks"
2. Klicken Sie auf "Endpunkt hinzufügen"
3. URL: `https://[IHRE-DOMAIN]/api/stripe-webhook`
4. Events auswählen:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Notieren Sie den **Webhook Secret** (beginnt mit `whsec_`)

### 5. Umgebungsvariablen konfigurieren

Fügen Sie folgende Variablen zu Ihrer `.env` Datei hinzu:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe Price IDs
STRIPE_PRICE_BASIC_KASSE=price_xxx
STRIPE_PRICE_BASIC_INVOICE=price_yyy
STRIPE_PRICE_RECHNUNG_BEST=price_zzz
```

### 6. Supabase Edge Function für Stripe deployen

Die Stripe-Integration erfolgt über Supabase Edge Functions. Die notwendigen Functions sind bereits im Projekt vorhanden und müssen nur deployed werden.

## Funktionsweise

### Subscription Flow

1. **Registrierung**: Neuer Benutzer erhält 14 Tage kostenlosen Trial mit `rechnung.best` Plan
2. **Trial-Ende**: System erstellt automatisch Stripe Checkout Session
3. **Zahlung**: Benutzer wird zu Stripe Checkout weitergeleitet
4. **Webhook**: Stripe informiert System über erfolgreiche Zahlung
5. **Aktivierung**: Subscription wird von `trialing` auf `active` gesetzt

### Plan-Wechsel

Benutzer können jederzeit über die Einstellungsseite:
- Upgraden (z.B. von basic_kasse zu rechnung.best)
- Downgraden (z.B. von rechnung.best zu basic_invoice)
- Kündigen (Subscription läuft bis Periodenende)

## Datenbank-Schema

Die Subscription-Daten werden in der `subscriptions` Tabelle gespeichert:

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  plan_type text CHECK (plan_type IN ('basic_kasse', 'basic_invoice', 'rechnung.best')),
  status text DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Sicherheit

- ✅ Alle Stripe API Calls erfolgen serverseitig via Edge Functions
- ✅ Webhook Signaturen werden validiert
- ✅ Sensitive Daten (Secret Keys) werden nie im Frontend exponiert
- ✅ Row Level Security (RLS) schützt Subscription-Daten

## Testing

### Test-Modus

Verwenden Sie Stripe's Test-Modus während der Entwicklung:
- Test Card: `4242 4242 4242 4242`
- Ablaufdatum: Beliebiges zukünftiges Datum
- CVC: Beliebige 3 Ziffern
- PLZ: Beliebige 5 Ziffern

### Live-Modus

Bevor Sie Live gehen:
1. Ersetzen Sie Test-Keys durch Live-Keys
2. Aktualisieren Sie Webhook-URL auf Production-Domain
3. Testen Sie den kompletten Payment-Flow
4. Aktivieren Sie Stripe Radar für Betrugsschutz

## Support

Bei Fragen zur Stripe-Integration:
- Stripe Dokumentation: https://stripe.com/docs
- Support: info@rechnung.best

## Nächste Schritte

1. Stripe Account einrichten und verifizieren
2. Produkte und Preise in Stripe erstellen
3. API Keys in `.env` eintragen
4. Edge Functions deployen
5. Payment-Flow testen
