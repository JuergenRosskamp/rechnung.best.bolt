import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import crypto from 'crypto-js';


import { getErrorMessage } from '../lib/errors';
const denominations = [
  { value: 500, label: '500€ Scheine' },
  { value: 200, label: '200€ Scheine' },
  { value: 100, label: '100€ Scheine' },
  { value: 50, label: '50€ Scheine' },
  { value: 20, label: '20€ Scheine' },
  { value: 10, label: '10€ Scheine' },
  { value: 5, label: '5€ Scheine' },
  { value: 2, label: '2€ Münzen' },
  { value: 1, label: '1€ Münzen' },
  { value: 0.5, label: '50 Cent' },
  { value: 0.2, label: '20 Cent' },
  { value: 0.1, label: '10 Cent' },
  { value: 0.05, label: '5 Cent' },
  { value: 0.02, label: '2 Cent' },
  { value: 0.01, label: '1 Cent' },
];

export function CashCountPage() {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [notes, setNotes] = useState('');
  const { user } = useAuthStore();

  const loadCurrentBalance = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_current_cash_balance', {
          p_tenant_id: user.tenant_id
        });

      if (error) throw error;
      setCalculatedBalance(data || 0);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  }, [user]);

  useEffect(() => {
    loadCurrentBalance();
  }, [loadCurrentBalance]);

  const handleCountChange = (value: number, count: string) => {
    const numCount = parseInt(count) || 0;
    setCounts(prev => ({
      ...prev,
      [value]: numCount
    }));
  };

  useEffect(() => {
    const total = denominations.reduce((sum, denom) => {
      const count = counts[denom.value] || 0;
      return sum + (denom.value * count);
    }, 0);
    setCurrentBalance(total);
  }, [counts]);

  const difference = currentBalance - calculatedBalance;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      const denominationBreakdown = denominations
        .filter(d => counts[d.value] > 0)
        .map(d => `${d.label}: ${counts[d.value]}x`)
        .join(', ');

      const { data: docNumber, error: docError } = await supabase
        .rpc('get_next_cashbook_number', {
          p_tenant_id: user.tenant_id
        });

      if (docError) throw docError;

      const { data: lastEntry } = await supabase
        .from('cashbook_entries')
        .select('hash')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousHash = lastEntry?.hash || '0';

      const entryData = {
        tenant_id: user.tenant_id,
        entry_date: new Date().toISOString().split('T')[0],
        document_number: docNumber,
        document_type: 'cash_count',
        category_id: null,
        description: `Kassensturz - Gezählt: ${currentBalance.toFixed(2)}€, Soll: ${calculatedBalance.toFixed(2)}€, Differenz: ${difference.toFixed(2)}€. ${notes ? `Notizen: ${notes}. ` : ''}Stückelung: ${denominationBreakdown}`,
        amount: difference,
        currency: 'EUR',
        vat_rate: 0,
        vat_amount: 0,
        net_amount: difference,
        reference: null,
        cash_balance: currentBalance,
        previous_hash: previousHash,
        created_by: user.id,
        created_at: new Date().toISOString(),
        ip_address: 'web',
        user_agent: navigator.userAgent,
      };

      const hash = calculateHash(entryData, previousHash);

      const { error: insertError } = await supabase
        .from('cashbook_entries')
        .insert([{
          ...entryData,
          hash,
          hash_timestamp: new Date().toISOString(),
        }]);

      if (insertError) throw insertError;

      const { error: auditError } = await supabase
        .from('cash_audits')
        .insert([{
          tenant_id: user.tenant_id,
          audit_date: new Date().toISOString(),
          expected_balance: calculatedBalance,
          counted_balance: currentBalance,
          difference: difference,
          denomination_breakdown: JSON.stringify(counts),
          notes: notes || null,
          performed_by: user.id,
        }]);

      if (auditError) throw auditError;

      window.location.href = '/cashbook';
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Fehler beim Speichern des Kassensturzes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/cashbook'}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kassensturz</h1>
            <p className="mt-1 text-sm text-gray-500">
              Physische Bargeldzählung und Abgleich mit dem Kassenbuch
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Bargeld zählen</h2>

                <div className="space-y-4">
                  {denominations.map((denom) => (
                    <div key={denom.value} className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700">
                          {denom.label}
                        </label>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          value={counts[denom.value] || ''}
                          onChange={(e) => handleCountChange(denom.value, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-right"
                          placeholder="0"
                        />
                      </div>
                      <div className="w-32 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {((counts[denom.value] || 0) * denom.value).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Notizen</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Optional: Notizen zum Kassensturz..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">GoBD-Hinweis</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Der Kassensturz wird mit Hash-Chain gesichert und ist unveränderlich. Differenzen werden automatisch als Buchung erfasst.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => window.location.href = '/cashbook'}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {isLoading ? 'Speichert...' : 'Kassensturz speichern'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Zusammenfassung</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Gezähltes Bargeld</span>
                  <span className="text-lg font-bold text-gray-900">
                    {currentBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Soll-Bestand (Kassenbuch)</span>
                  <span className="text-lg font-medium text-gray-700">
                    {calculatedBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3">
                  <span className="text-sm font-medium text-gray-900">Differenz</span>
                  <span className={`text-xl font-bold ${
                    difference === 0 ? 'text-green-600' :
                    difference > 0 ? 'text-blue-600' :
                    'text-red-600'
                  }`}>
                    {difference > 0 ? '+' : ''}{difference.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>

              {difference !== 0 && (
                <div className={`mt-4 p-3 rounded-lg ${
                  difference > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${difference > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                    {difference > 0 ? (
                      <>
                        <strong>Überschuss:</strong> Es ist mehr Bargeld in der Kasse als laut Kassenbuch.
                      </>
                    ) : (
                      <>
                        <strong>Fehlbetrag:</strong> Es ist weniger Bargeld in der Kasse als laut Kassenbuch.
                      </>
                    )}
                  </p>
                </div>
              )}

              {difference === 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Korrekt:</strong> Der gezählte Bestand stimmt mit dem Kassenbuch überein.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Stückelung</h4>
              <div className="space-y-2">
                {denominations
                  .filter(d => counts[d.value] > 0)
                  .map(d => (
                    <div key={d.value} className="flex justify-between text-sm">
                      <span className="text-gray-600">{d.label}</span>
                      <span className="font-medium text-gray-900">{counts[d.value]}x</span>
                    </div>
                  ))}
                {Object.keys(counts).length === 0 && (
                  <p className="text-sm text-gray-500 italic">Keine Stückelung erfasst</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
