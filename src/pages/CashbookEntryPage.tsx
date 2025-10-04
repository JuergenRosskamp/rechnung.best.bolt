import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import crypto from 'crypto-js';
import { ReceiptUpload, ReceiptData } from '../components/ReceiptUpload';
import { checkForDuplicates, DuplicateCheckResult } from '../lib/cashbookValidation';

const entrySchema = z.object({
  entry_date: z.string()
    .min(1, 'Datum erforderlich')
    .refine((date) => {
      const entryDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return entryDate <= today;
    }, 'Datum darf nicht in der Zukunft liegen'),
  document_type: z.enum(['income', 'expense']),
  category_id: z.string().min(1, 'Kategorie erforderlich'),
  description: z.string().min(1, 'Beschreibung erforderlich'),
  amount: z.coerce.number().min(0.01, 'Betrag muss größer als 0 sein'),
  vat_rate: z.coerce.number().min(0).max(100),
  reference: z.string().optional(),
});

type EntryForm = z.infer<typeof entrySchema>;

interface Category {
  id: string;
  category_code: string;
  category_name: string;
  category_type: string;
}

export function CashbookEntryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [forceSave, setForceSave] = useState(false);
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      entry_date: new Date().toISOString().split('T')[0],
      document_type: 'income',
      vat_rate: 19,
    },
  });

  const documentType = watch('document_type');
  const amount = watch('amount');
  const vatRate = watch('vat_rate');

  const loadCategories = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cashbook_categories')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('category_name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
    }
  }, [user]);

  const loadCurrentBalance = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_current_cash_balance', {
          p_tenant_id: user.tenant_id
        });

      if (error) throw error;
      setCurrentBalance(data || 0);
    } catch (error) {
    }
  }, [user]);

  useEffect(() => {
    loadCategories();
    loadCurrentBalance();
  }, [loadCategories, loadCurrentBalance]);

  const handleReceiptProcessed = (data: ReceiptData) => {
    if (data.date) {
      setValue('entry_date', data.date);
    }
    if (data.amount) {
      setValue('amount', data.amount);
    }
    if (data.vatRate !== undefined) {
      setValue('vat_rate', data.vatRate);
    }
    if (data.description) {
      setValue('description', data.description);
    }
    if (data.documentType) {
      setValue('document_type', data.documentType);
    }
  };

  const calculateHash = (entryData: any, previousHash: string): string => {
    const dataString = JSON.stringify({
      tenant_id: entryData.tenant_id,
      entry_date: entryData.entry_date,
      document_number: entryData.document_number,
      amount: entryData.amount,
      description: entryData.description,
      previous_hash: previousHash,
      created_at: entryData.created_at,
    });

    return crypto.SHA256(dataString).toString();
  };

  const onSubmit = async (data: EntryForm) => {
    if (!user) return;

    if (!forceSave) {
      const duplicateCheck = await checkForDuplicates(
        user.tenant_id,
        data.entry_date,
        data.amount,
        data.description,
        data.document_type
      );

      if (duplicateCheck.isDuplicate) {
        setDuplicateWarning(duplicateCheck);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError('');
      setDuplicateWarning(null);

      // Get next document number
      const { data: docNumber, error: docError } = await supabase
        .rpc('get_next_cashbook_number', {
          p_tenant_id: user.tenant_id
        });

      if (docError) throw docError;

      // Get previous hash
      const { data: lastEntry } = await supabase
        .from('cashbook_entries')
        .select('hash')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousHash = lastEntry?.hash || '0';

      // Calculate amounts
      const netAmount = data.amount / (1 + data.vat_rate / 100);
      const vatAmount = data.amount - netAmount;
      const signedAmount = data.document_type === 'expense' ? -data.amount : data.amount;
      const newBalance = currentBalance + signedAmount;

      // Check for negative balance
      if (newBalance < 0) {
        setError(`Ausgabe würde zu negativem Kassenbestand führen (${newBalance.toFixed(2)} EUR). Aktueller Bestand: ${currentBalance.toFixed(2)} EUR`);
        setIsLoading(false);
        return;
      }

      // Create entry object
      const entryData = {
        tenant_id: user.tenant_id,
        entry_date: data.entry_date,
        document_number: docNumber,
        document_type: data.document_type,
        category_id: data.category_id,
        description: data.description,
        amount: signedAmount,
        currency: 'EUR',
        vat_rate: data.vat_rate,
        vat_amount: vatAmount,
        net_amount: netAmount,
        reference: data.reference || null,
        cash_balance: newBalance,
        previous_hash: previousHash,
        created_by: user.id,
        created_at: new Date().toISOString(),
        ip_address: 'web',
        user_agent: navigator.userAgent,
      };

      // Calculate hash
      const hash = calculateHash(entryData, previousHash);

      // Insert entry
      const { error: insertError } = await supabase
        .from('cashbook_entries')
        .insert([{
          ...entryData,
          hash,
          hash_timestamp: new Date().toISOString(),
          receipt_id: receiptId,
        }]);

      if (insertError) throw insertError;

      // Redirect to cashbook
      window.location.href = '/cashbook';
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Fehler beim Speichern der Buchung');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    cat => cat.category_type === documentType
  );

  const calculatedVat = amount && vatRate ? (amount - (amount / (1 + vatRate / 100))) : 0;
  const calculatedNet = amount && vatRate ? (amount / (1 + vatRate / 100)) : amount || 0;
  const newBalance = documentType === 'income'
    ? currentBalance + (amount || 0)
    : currentBalance - (amount || 0);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/cashbook'}
            className="p-2 hover:bg-gray-100 dark:bg-secondary-700 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-secondary-50">Neue Kassenbuchung</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-secondary-500">
              GoBD-konforme Kassenbuchung erstellen
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {duplicateWarning && duplicateWarning.isDuplicate && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-900 mb-2">Mögliche Doppelbuchung erkannt!</h3>
                <p className="text-sm text-yellow-800 mb-3">{duplicateWarning.matchReason}</p>
                {duplicateWarning.matchingEntry && (
                  <div className="bg-white dark:bg-secondary-800 rounded border border-yellow-300 p-3 mb-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-secondary-500 mb-2">Vorhandene Buchung:</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Datum:</span> {new Date(duplicateWarning.matchingEntry.entry_date).toLocaleDateString('de-DE')}</p>
                      <p><span className="font-medium">Betrag:</span> {Math.abs(duplicateWarning.matchingEntry.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                      <p><span className="font-medium">Beschreibung:</span> {duplicateWarning.matchingEntry.description}</p>
                      <p><span className="font-medium">Belegnr.:</span> {duplicateWarning.matchingEntry.document_number}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setDuplicateWarning(null)}
                    className="px-4 py-2 bg-white dark:bg-secondary-800 border-2 border-yellow-600 text-yellow-900 rounded-lg hover:bg-yellow-50 font-medium"
                  >
                    Abbrechen & Überprüfen
                  </button>
                  <button
                    onClick={() => {
                      setForceSave(true);
                      setDuplicateWarning(null);
                      handleSubmit(onSubmit)();
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                  >
                    Trotzdem speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Balance */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-900">Aktueller Kassenbestand</p>
              <p className="mt-1 text-2xl font-bold text-primary-900">
                {currentBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            {amount > 0 && (
              <div className="text-right">
                <p className="text-sm font-medium text-primary-900">Neuer Bestand</p>
                <p className={`mt-1 text-2xl font-bold ${
                  newBalance < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {newBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Receipt Upload */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <ReceiptUpload
              onReceiptProcessed={handleReceiptProcessed}
              onReceiptIdChange={setReceiptId}
            />
          </div>

          {/* Entry Type */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-secondary-50">Buchungsdetails</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                Vorgangstyp *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center flex-1">
                  <input
                    {...register('document_type')}
                    type="radio"
                    value="income"
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-secondary-200">Einnahme (Geld in die Kasse)</span>
                </label>
                <label className="flex items-center flex-1">
                  <input
                    {...register('document_type')}
                    type="radio"
                    value="expense"
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-secondary-200">Ausgabe (Geld aus der Kasse)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="entry_date" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Datum *
                </label>
                <input
                  {...register('entry_date')}
                  type="date"
                  id="entry_date"
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {errors.entry_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.entry_date.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Kategorie *
                </label>
                <select
                  {...register('category_id')}
                  id="category_id"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Kategorie wählen</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                Beschreibung *
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Detaillierte Beschreibung des Vorgangs..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="reference" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                Referenz (z.B. Belegnummer)
              </label>
              <input
                {...register('reference')}
                type="text"
                id="reference"
                className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-secondary-50">Beträge</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Bruttobetrag (inkl. MwSt.) *
                </label>
                <div className="relative">
                  <input
                    {...register('amount')}
                    type="number"
                    step="0.01"
                    id="amount"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-secondary-500">€</span>
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="vat_rate" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  MwSt.-Satz
                </label>
                <select
                  {...register('vat_rate')}
                  id="vat_rate"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="0">0% (steuerfrei)</option>
                  <option value="7">7% (ermäßigt)</option>
                  <option value="19">19% (Regelsteuersatz)</option>
                </select>
              </div>
            </div>

            {/* Calculated amounts */}
            {amount > 0 && (
              <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-secondary-400">Nettobetrag:</span>
                  <span className="font-medium">
                    {calculatedNet.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-secondary-400">MwSt. ({vatRate}%):</span>
                  <span className="font-medium">
                    {calculatedVat.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Bruttobetrag:</span>
                  <span>
                    {amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* GoBD Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">GoBD-Hinweis</h3>
                <p className="mt-1 text-sm text-blue-700">
                  Diese Buchung wird mit einer kryptografischen Hash-Chain gesichert und ist nach dem Speichern unveränderlich.
                  Korrekturen können nur durch Stornobuchungen vorgenommen werden.
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => window.location.href = '/cashbook'}
              className="px-6 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {isLoading ? 'Speichert...' : 'Buchung speichern'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
