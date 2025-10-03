import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import crypto from 'crypto-js';

interface CashbookCancellationProps {
  entryId: string;
  entry: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CashbookCancellation({ entryId, entry, onClose, onSuccess }: CashbookCancellationProps) {
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  const handleCancel = async () => {
    if (!user || !reason.trim()) {
      setError('Bitte geben Sie einen Stornierungsgrund an');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      const { data: lastEntry } = await supabase
        .from('cashbook_entries')
        .select('hash')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousHash = lastEntry?.hash || '0';

      const { data: docNumber, error: docError } = await supabase
        .rpc('get_next_cashbook_number', {
          p_tenant_id: user.tenant_id
        });

      if (docError) throw docError;

      const cancellationData = {
        tenant_id: user.tenant_id,
        entry_date: new Date().toISOString().split('T')[0],
        document_number: docNumber,
        document_type: entry.document_type === 'income' ? 'expense' : 'income',
        category_id: entry.category_id,
        description: `STORNO: ${entry.description} (Original: ${entry.document_number})`,
        amount: -entry.amount,
        currency: 'EUR',
        vat_rate: entry.vat_rate,
        vat_amount: -entry.vat_amount,
        net_amount: -entry.net_amount,
        reference: `STORNO-${entry.document_number}`,
        cash_balance: entry.cash_balance - entry.amount,
        previous_hash: previousHash,
        created_by: user.id,
        created_at: new Date().toISOString(),
        ip_address: 'web',
        user_agent: navigator.userAgent,
      };

      const dataString = JSON.stringify({
        tenant_id: cancellationData.tenant_id,
        entry_date: cancellationData.entry_date,
        document_number: cancellationData.document_number,
        amount: cancellationData.amount,
        description: cancellationData.description,
        previous_hash: previousHash,
        created_at: cancellationData.created_at,
      });

      const hash = crypto.SHA256(dataString).toString();

      const { error: insertError } = await supabase
        .from('cashbook_entries')
        .insert([{
          ...cancellationData,
          hash,
          hash_timestamp: new Date().toISOString(),
        }]);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('cashbook_entries')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
          cancellation_reason: reason,
        })
        .eq('id', entryId)
        .eq('tenant_id', user.tenant_id);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err) || 'Fehler beim Stornieren');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-secondary-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-secondary-50">Kassenbuchung stornieren</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">Wichtiger Hinweis</h3>
          <p className="text-sm text-yellow-800">
            Gemäß GoBD können Kassenbucheinträge nicht gelöscht werden. Es wird eine Stornobuchung erstellt,
            die den ursprünglichen Eintrag ausgleicht. Beide Einträge bleiben im Kassenbuch sichtbar.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Zu stornierende Buchung:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Datum:</span>
              <span className="font-medium">{new Date(entry.entry_date).toLocaleDateString('de-DE')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Belegnummer:</span>
              <span className="font-medium">{entry.document_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Beschreibung:</span>
              <span className="font-medium">{entry.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Betrag:</span>
              <span className={`font-medium ${
                entry.document_type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(entry.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stornierungsgrund * (wird im Audit-Trail gespeichert)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Detaillierter Grund für die Stornierung..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing || !reason.trim()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isProcessing ? 'Storniere...' : 'Buchung stornieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
