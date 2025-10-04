const errorMessages: Record<string, string> = {
  'duplicate key value violates unique constraint "invoices_pkey"': 'Diese Rechnung existiert bereits',
  'duplicate key value violates unique constraint "customers_email_key"': 'Ein Kunde mit dieser E-Mail existiert bereits',
  'duplicate key value violates unique constraint "customers_customer_number_key"': 'Diese Kundennummer ist bereits vergeben',
  'duplicate key value violates unique constraint "articles_article_number_key"': 'Diese Artikelnummer ist bereits vergeben',
  'violates foreign key constraint': 'Der verknüpfte Datensatz existiert nicht',
  'permission denied': 'Sie haben keine Berechtigung für diese Aktion',
  'JWT expired': 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an',
  'invalid input syntax': 'Ungültige Eingabe',
  'value too long': 'Der eingegebene Text ist zu lang',
  'not-null constraint': 'Dieses Feld darf nicht leer sein',
  'Network request failed': 'Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung',
  'Failed to fetch': 'Verbindungsfehler. Bitte versuchen Sie es erneut'
};

export function getErrorMessage(error: unknown): string {
  let message = '';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String(error.message);
  } else {
    return 'Ein unbekannter Fehler ist aufgetreten';
  }

  for (const [key, friendlyMessage] of Object.entries(errorMessages)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return friendlyMessage;
    }
  }

  if (message.includes('PGRST')) {
    return 'Datenbankfehler. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support';
  }

  if (message.length > 200) {
    return 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es erneut';
  }

  return message;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}
