import { supabase } from './supabase';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchingEntry?: any;
  matchReason?: string;
}

export async function checkForDuplicates(
  tenantId: string,
  entryDate: string,
  amount: number,
  description: string,
  documentType: string
): Promise<DuplicateCheckResult> {
  const dateObj = new Date(entryDate);
  const dayBefore = new Date(dateObj);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(dateObj);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const { data: entries, error } = await supabase
    .from('cashbook_entries')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_cancelled', false)
    .gte('entry_date', dayBefore.toISOString().split('T')[0])
    .lte('entry_date', dayAfter.toISOString().split('T')[0]);

  if (error) {
    console.error('Error checking duplicates:', error);
    return { isDuplicate: false };
  }

  if (!entries || entries.length === 0) {
    return { isDuplicate: false };
  }

  for (const entry of entries) {
    const amountMatches = Math.abs(entry.amount) === Math.abs(amount);
    const dateMatches = entry.entry_date === entryDate;
    const typeMatches = entry.document_type === documentType;

    const descriptionSimilarity = calculateSimilarity(
      description.toLowerCase().trim(),
      entry.description.toLowerCase().trim()
    );

    if (amountMatches && dateMatches && typeMatches && descriptionSimilarity > 0.8) {
      return {
        isDuplicate: true,
        matchingEntry: entry,
        matchReason: 'Identischer Betrag, Datum, Typ und ähnliche Beschreibung'
      };
    }

    if (amountMatches && dateMatches && typeMatches) {
      return {
        isDuplicate: true,
        matchingEntry: entry,
        matchReason: 'Identischer Betrag, Datum und Typ'
      };
    }

    if (amountMatches && dateMatches && descriptionSimilarity > 0.9) {
      return {
        isDuplicate: true,
        matchingEntry: entry,
        matchReason: 'Identischer Betrag, Datum und sehr ähnliche Beschreibung'
      };
    }
  }

  return { isDuplicate: false };
}

function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.includes(shorter)) return 0.85;

  const editDistance = levenshteinDistance(str1, str2);
  return 1 - editDistance / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export async function verifyHashChain(tenantId: string): Promise<{
  isValid: boolean;
  brokenAt?: string;
  totalEntries: number;
  verifiedEntries: number;
}> {
  const { data: entries, error } = await supabase
    .from('cashbook_entries')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_cancelled', false)
    .order('created_at', { ascending: true });

  if (error || !entries) {
    return { isValid: false, totalEntries: 0, verifiedEntries: 0 };
  }

  let previousHash = '0';
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (entry.previous_hash !== previousHash) {
      return {
        isValid: false,
        brokenAt: entry.document_number,
        totalEntries: entries.length,
        verifiedEntries: i
      };
    }

    previousHash = entry.hash;
  }

  return {
    isValid: true,
    totalEntries: entries.length,
    verifiedEntries: entries.length
  };
}
