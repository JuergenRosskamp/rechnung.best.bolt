import { supabase } from './supabase';

export interface DATEVExportOptions {
  tenantId: string;
  startDate: string;
  endDate: string;
  skr: 'SKR03' | 'SKR04';
  includeVAT?: boolean;
}

export interface DATEVEntry {
  buchungsdatum: string;
  belegnummer: string;
  sollkonto: string;
  habenkonto: string;
  betrag: number;
  waehrung: string;
  buchungstext: string;
  ustSchluessel?: string;
  kostenstelle?: string;
  kostentraeger?: string;
}

const KASSEN_KONTO_SKR03 = '1000';
const KASSEN_KONTO_SKR04 = '1600';

export async function generateDATEVExport(options: DATEVExportOptions): Promise<string> {
  const kassenKonto = options.skr === 'SKR03' ? KASSEN_KONTO_SKR03 : KASSEN_KONTO_SKR04;

  const { data: entries, error } = await supabase
    .from('cashbook_entries')
    .select(`
      *,
      category:cashbook_categories(category_code, category_name, account_number)
    `)
    .eq('tenant_id', options.tenantId)
    .eq('is_cancelled', false)
    .gte('entry_date', options.startDate)
    .lte('entry_date', options.endDate)
    .order('entry_date', { ascending: true })
    .order('document_number', { ascending: true });

  if (error || !entries) {
    throw new Error('Fehler beim Laden der Kassenbuch-Einträge');
  }

  const datevEntries: DATEVEntry[] = entries.map(entry => {
    const accountNumber = entry.category?.account_number || '9999';
    const isIncome = entry.document_type === 'income';

    const sollKonto = isIncome ? kassenKonto : accountNumber;
    const habenKonto = isIncome ? accountNumber : kassenKonto;

    let ustSchluessel = '';
    if (options.includeVAT && entry.vat_rate > 0) {
      if (entry.vat_rate === 19) {
        ustSchluessel = isIncome ? '3' : '9';
      } else if (entry.vat_rate === 7) {
        ustSchluessel = isIncome ? '2' : '8';
      }
    }

    return {
      buchungsdatum: new Date(entry.entry_date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\./g, ''),
      belegnummer: entry.document_number,
      sollkonto: sollKonto,
      habenkonto: habenKonto,
      betrag: Math.abs(entry.amount),
      waehrung: entry.currency || 'EUR',
      buchungstext: entry.description.substring(0, 60),
      ustSchluessel: ustSchluessel || undefined,
      kostenstelle: undefined,
      kostentraeger: undefined,
    };
  });

  return generateDATEVCSV(datevEntries, options.skr);
}

function generateDATEVCSV(entries: DATEVEntry[], skr: string): string {
  const header = [
    'Umsatz (ohne Soll/Haben-Kz)',
    'Soll/Haben-Kennzeichen',
    'WKZ Umsatz',
    'Kurs',
    'Basis-Umsatz',
    'WKZ Basis-Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Belegfeld 2',
    'Skonto',
    'Buchungstext',
    'Postensperre',
    'Diverse Adressnummer',
    'Geschäftspartnerbank',
    'Sachverhalt',
    'Zinssperre',
    'Beleglink',
    'Beleginfo - Art 1',
    'Beleginfo - Inhalt 1',
    'Beleginfo - Art 2',
    'Beleginfo - Inhalt 2',
    'Beleginfo - Art 3',
    'Beleginfo - Inhalt 3',
    'Beleginfo - Art 4',
    'Beleginfo - Inhalt 4',
    'Beleginfo - Art 5',
    'Beleginfo - Inhalt 5',
    'Beleginfo - Art 6',
    'Beleginfo - Inhalt 6',
    'Beleginfo - Art 7',
    'Beleginfo - Inhalt 7',
    'Beleginfo - Art 8',
    'Beleginfo - Inhalt 8',
    'KOST1 - Kostenstelle',
    'KOST2 - Kostenträger',
    'Kost-Datum',
    'KOST-Menge',
    'EU-Mitgliedstaat u. UStID',
    'EU-Steuersatz',
    'Abw. Versteuerungsart',
    'Sachverhalt L+L',
    'Funktionsergänzung L+L',
    'BU 49 Hauptfunktionstyp',
    'BU 49 Hauptfunktionsnummer',
    'BU 49 Funktionsergänzung',
    'Zusatzinformation - Art 1',
    'Zusatzinformation - Inhalt 1'
  ];

  const rows = entries.map(entry => {
    const row = new Array(header.length).fill('');

    row[0] = entry.betrag.toFixed(2).replace('.', ',');
    row[1] = 'S';
    row[2] = entry.waehrung;
    row[3] = '';
    row[4] = '';
    row[5] = '';
    row[6] = entry.sollkonto;
    row[7] = entry.habenkonto;
    row[8] = entry.ustSchluessel || '';
    row[9] = entry.buchungsdatum;
    row[10] = entry.belegnummer;
    row[11] = '';
    row[12] = '';
    row[13] = entry.buchungstext;

    for (let i = 14; i < 36; i++) row[i] = '';

    row[36] = entry.kostenstelle || '';
    row[37] = entry.kostentraeger || '';

    for (let i = 38; i < header.length; i++) row[i] = '';

    return row.map(field => `"${field}"`).join(';');
  });

  const metaHeader = `EXTF;700;21;Buchungsstapel;;;${skr};`;
  const metaDetails = `"Berater";"Mandant";"WJ-Beginn";"Sachkontenlänge";"Datum vom";"Datum bis";"Bezeichnung";"Diktatkürzel";"Buchungstyp";"Rechnungslegungszweck";"Festschreibung";"WKZ"`;
  const metaData = `"";"";"";"4";"";"";"";"";"";"";"";"EUR"`;

  return [
    metaHeader,
    metaDetails,
    metaData,
    '',
    header.map(h => `"${h}"`).join(';'),
    ...rows
  ].join('\n');
}

export async function exportToDatabank(options: DATEVExportOptions): Promise<Blob> {
  const csv = await generateDATEVExport(options);

  const bom = '\ufeff';
  return new Blob([bom + csv], {
    type: 'text/csv;charset=utf-8;'
  });
}
