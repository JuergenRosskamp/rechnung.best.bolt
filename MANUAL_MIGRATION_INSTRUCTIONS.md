# MANUELLE MIGRATION - SCHRITT FÜR SCHRITT

## Problem
Die "objects" Tabelle gehört dem Storage-System und kann nicht direkt gelöscht werden.

## Lösung: 2-Schritt-Prozess

### SCHRITT 1: Löschen Sie den Storage Bucket über die Supabase UI

1. Öffnen Sie Supabase Dashboard
2. Gehen Sie zu **Storage** (linkes Menü)
3. Suchen Sie den Bucket **"receipts"**
4. Klicken Sie auf die drei Punkte (...)
5. Wählen Sie **"Delete bucket"**
6. Bestätigen Sie die Löschung

### SCHRITT 2: Führen Sie die SQL Migration aus

Kopieren Sie die Datei `complete_migration.sql` in den Supabase SQL Editor und führen Sie sie aus.

---

## Alternative: Wenn Sie den Bucket behalten möchten

Führen Sie stattdessen `complete_migration_keep_storage.sql` aus - diese Version löscht nur die Datenbank-Tabellen.
