# Problem: User existiert in auth.users, aber nicht in users Tabelle

Der User `juergen.rosskamp@gmail.com` wurde in `auth.users` angelegt, aber die Registrierung wurde nicht vollständig abgeschlossen (kein Profil in der `users` Tabelle).

## Lösung 1: Über Supabase Dashboard (Empfohlen)

1. Gehe zu: https://0ec90b57d6e95fcbda19832f.supabase.co/project/_/auth/users
2. Suche nach `juergen.rosskamp@gmail.com`
3. Klicke auf die drei Punkte rechts neben dem User
4. Wähle "Delete User"
5. Bestätige die Löschung

Danach kannst du dich neu registrieren und das Profil wird korrekt angelegt.

## Lösung 2: Über SQL Editor

Falls du Zugriff auf den SQL Editor hast:

1. Gehe zu: https://0ec90b57d6e95fcbda19832f.supabase.co/project/_/sql/new
2. Führe diesen Befehl aus:

```sql
-- Finde den User
SELECT id, email, created_at
FROM auth.users
WHERE email = 'juergen.rosskamp@gmail.com';

-- Lösche den Auth-User (kopiere die ID aus dem Ergebnis oben)
DELETE FROM auth.users WHERE email = 'juergen.rosskamp@gmail.com';
```

3. Nach der Löschung kannst du dich neu registrieren

## Lösung 3: Profil manuell erstellen (Alternative)

Falls du den Auth-User behalten möchtest, kannst du das fehlende Profil manuell erstellen:

```sql
-- 1. Finde die Auth User ID
SELECT id FROM auth.users WHERE email = 'juergen.rosskamp@gmail.com';

-- 2. Erstelle einen Tenant
INSERT INTO tenants (company_name, created_at, updated_at)
VALUES ('Rosskamp Consulting GmbH', now(), now())
RETURNING id;

-- 3. Erstelle das User-Profil (ersetze USER_ID und TENANT_ID mit den Werten von oben)
INSERT INTO users (id, tenant_id, email, role, created_at, updated_at)
VALUES (
  'USER_ID_HIER',
  'TENANT_ID_HIER',
  'juergen.rosskamp@gmail.com',
  'admin',
  now(),
  now()
);

-- 4. Erstelle Subscription (ersetze TENANT_ID)
INSERT INTO subscriptions (tenant_id, plan_type, status, trial_ends_at, created_at, updated_at)
VALUES (
  'TENANT_ID_HIER',
  'rechnung.best',
  'trialing',
  now() + interval '14 days',
  now(),
  now()
);
```

## Warum ist das passiert?

Mögliche Ursachen:
- Die Registrierung wurde abgebrochen bevor alle Schritte abgeschlossen waren
- Ein Fehler bei der Profilerstellung (z.B. RLS-Probleme)
- Die Transaktion wurde nicht vollständig ausgeführt

## Nach der Lösung

Nach einer der obigen Lösungen solltest du:
1. Die App neu laden
2. Auf "Registrieren" gehen
3. Die gleichen Daten eingeben:
   - Email: juergen.rosskamp@gmail.com
   - Passwort: Password123456!
   - Firmenname: Rosskamp Consulting GmbH

Die Registrierung wird dann vollständig durchlaufen und alle Testdaten werden angelegt.
