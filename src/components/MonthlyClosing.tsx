import { useState, useEffect } from 'react';
import { Calendar, DollarSign, AlertTriangle, CheckCircle, FileText, Lock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

interface MonthlyClosingProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface DenominationCount {
  [key: string]: number;
}

export function MonthlyClosing({ onClose, onSuccess }: MonthlyClosingProps) {
  const [step, setStep] = useState<'select' | 'count' | 'review' | 'finalize'>('select');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [closingData, setClosingData] = useState<any>(null);
  const [countedBalance, setCountedBalance] = useState(0);
  const [notes, setNotes] = useState('');
  const [differenceExplanation, setDifferenceExplanation] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);

  const [denominations, setDenominations] = useState<DenominationCount>({
    '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0,
    '2': 0, '1': 0, '0.5': 0, '0.2': 0, '0.1': 0, '0.05': 0, '0.02': 0, '0.01': 0,
  });

  const { user } = useAuthStore();

  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  useEffect(() => {
    const total = Object.entries(denominations).reduce((sum, [value, count]) => {
      return sum + (parseFloat(value) * count);
    }, 0);
    setCountedBalance(total);
  }, [denominations]);

  const handleCreateDraft = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      const { data, error: rpcError } = await supabase
        .rpc('create_monthly_closing', {
          p_tenant_id: user.tenant_id,
          p_year: selectedYear,
          p_month: selectedMonth,
          p_counted_balance: countedBalance,
          p_denomination_details: denominations,
          p_notes: notes,
          p_user_id: user.id,
        });

      if (rpcError) throw rpcError;

      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Erstellen des Abschlusses');
      }

      setClosingData(data);
      setClosingId(data.closing_id);
      setStep('review');
    } catch (err) {
      setError(getErrorMessage(err) || 'Fehler beim Erstellen des Entwurfs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!user || !closingId) return;

    if (closingData.difference !== 0 && !differenceExplanation.trim()) {
      setError('Bitte erklären Sie die Differenz');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const { data, error: rpcError } = await supabase
        .rpc('finalize_monthly_closing', {
          p_closing_id: closingId,
          p_user_id: user.id,
          p_difference_explanation: differenceExplanation || null,
        });

      if (rpcError) throw rpcError;

      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Finalisieren');
      }

      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err) || 'Fehler beim Finalisieren');
    } finally {
      setIsLoading(false);
    }
  };

  const denominationLabels: { [key: string]: string } = {
    '500': '500 €',
    '200': '200 €',
    '100': '100 €',
    '50': '50 €',
    '20': '20 €',
    '10': '10 €',
    '5': '5 €',
    '2': '2 €',
    '1': '1 €',
    '0.5': '50 Cent',
    '0.2': '20 Cent',
    '0.1': '10 Cent',
    '0.05': '5 Cent',
    '0.02': '2 Cent',
    '0.01': '1 Cent',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-secondary-800 rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-secondary-800 border-b border-gray-200 dark:border-secondary-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-secondary-50">Monatsabschluss erstellen</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-secondary-600 hover:text-gray-600 dark:text-secondary-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Step 1: Select Period */}
          {step === 'select' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Der Monatsabschluss dokumentiert den Kassenbestand am Monatsende und gleicht
                  diesen mit den Buchungen ab. Dies ist GoBD-pflicht und sollte monatlich durchgeführt werden.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                    Jahr
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                    Monat
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {months.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => setStep('count')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Weiter zur Kassenzählung
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Count Cash */}
          {step === 'count' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Zählen Sie den tatsächlichen Kassenbestand am Ende des Monats {months[selectedMonth - 1]} {selectedYear}.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Bargeld-Stückelung
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.keys(denominations).map((value) => (
                    <div key={value} className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-600 dark:text-secondary-400 mb-1">
                        {denominationLabels[value]}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={denominations[value]}
                        onChange={(e) => setDenominations({
                          ...denominations,
                          [value]: parseInt(e.target.value) || 0
                        })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-secondary-600 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700 dark:text-secondary-200">Gezählter Kassenbestand:</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-secondary-50">
                    {countedBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Bemerkungen (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Besondere Vorkommnisse, Auffälligkeiten..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep('select')}
                  className="px-6 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800"
                >
                  Zurück
                </button>
                <button
                  onClick={handleCreateDraft}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Erstelle Entwurf...' : 'Entwurf erstellen'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && closingData && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-secondary-50">
                  Monatsabschluss {months[selectedMonth - 1]} {selectedYear}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-secondary-700/30 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-secondary-500 mb-1">Anfangsbestand</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-secondary-50">
                      {parseFloat(closingData.opening_balance).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-secondary-700/30 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-secondary-500 mb-1">Einnahmen</p>
                    <p className="text-xl font-bold text-green-600">
                      +{parseFloat(closingData.total_income).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-secondary-700/30 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-secondary-500 mb-1">Ausgaben</p>
                    <p className="text-xl font-bold text-red-600">
                      -{parseFloat(closingData.total_expense).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-secondary-700/30 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-secondary-500 mb-1">Buchungen</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-secondary-50">
                      {closingData.transaction_count}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-300 dark:border-secondary-600 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 dark:text-secondary-200">Berechneter Bestand (Soll):</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-secondary-50">
                      {parseFloat(closingData.calculated_balance).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 dark:text-secondary-200">Gezählter Bestand (Ist):</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-secondary-50">
                      {parseFloat(closingData.counted_balance).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center pt-2 border-t border-gray-300 dark:border-secondary-600 ${
                    Math.abs(parseFloat(closingData.difference)) > 0.01 ? 'bg-yellow-50 -mx-4 px-4 py-2 rounded' : ''
                  }`}>
                    <span className="font-bold text-gray-900 dark:text-secondary-50">Differenz:</span>
                    <span className={`text-xl font-bold ${
                      Math.abs(parseFloat(closingData.difference)) < 0.01 ? 'text-green-600' :
                      parseFloat(closingData.difference) > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {Math.abs(parseFloat(closingData.difference)) < 0.01 ? (
                        <span className="flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Keine Differenz
                        </span>
                      ) : (
                        <>
                          {parseFloat(closingData.difference) > 0 ? '+' : ''}
                          {parseFloat(closingData.difference).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {Math.abs(parseFloat(closingData.difference)) > 0.01 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-900 mb-2">Differenz erkannt</h4>
                      <p className="text-sm text-yellow-800 mb-3">
                        Bitte erklären Sie die Abweichung zwischen Soll und Ist. Dies ist für die GoBD-Konformität erforderlich.
                      </p>
                      <textarea
                        value={differenceExplanation}
                        onChange={(e) => setDifferenceExplanation(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm"
                        placeholder="Detaillierte Erklärung der Differenz (z.B. Rundungsdifferenzen, Wechselgeld-Fehler, etc.)..."
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Wichtiger Hinweis</h4>
                    <p className="text-sm text-blue-800">
                      Nach der Finalisierung kann der Monatsabschluss nicht mehr geändert werden.
                      Er wird mit einer kryptografischen Signatur versehen und ist GoBD-konform unveränderlich.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={isLoading || (Math.abs(parseFloat(closingData.difference)) > 0.01 && !differenceExplanation.trim())}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isLoading ? 'Finalisiere...' : 'Abschluss finalisieren'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
