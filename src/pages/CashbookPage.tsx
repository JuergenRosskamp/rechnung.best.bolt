import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, DollarSign, Calculator, Upload, FileText, Download, Shield, XCircle, Calendar } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ReceiptUpload, ReceiptData } from '../components/ReceiptUpload';
import { verifyHashChain } from '../lib/cashbookValidation';
import { CashbookCancellation } from '../components/CashbookCancellation';
import { MonthlyClosing } from '../components/MonthlyClosing';

interface CashbookEntry {
  id: string;
  entry_date: string;
  document_number: string;
  document_type: string;
  description: string;
  amount: number;
  cash_balance: number;
  category_code: string;
  vat_rate: number;
  is_cancelled: boolean;
}

export function CashbookPage() {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [hashVerification, setHashVerification] = useState<any>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const [showMonthlyClosing, setShowMonthlyClosing] = useState(false);
  const [monthlyClosings, setMonthlyClosings] = useState<any[]>([]);
  const { user } = useAuthStore();

  const loadCashbook = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('cashbook_entries')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('is_cancelled', false)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('document_type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);

      // Get current balance
      if (data && data.length > 0) {
        setCurrentBalance(data[0].cash_balance);
      }
    } catch (error) {
      console.error('Error loading cashbook:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, typeFilter]);

  const loadMonthlyClosings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cashbook_monthly_closings')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('closing_year', { ascending: false })
        .order('closing_month', { ascending: false })
        .limit(6);

      if (error) throw error;
      setMonthlyClosings(data || []);
    } catch (error) {
      console.error('Error loading monthly closings:', error);
    }
  }, [user]);

  useEffect(() => {
    loadCashbook();
    loadMonthlyClosings();
  }, [loadCashbook, loadMonthlyClosings]);

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      income: 'Einnahme',
      expense: 'Ausgabe',
      opening_balance: 'Anfangsbestand',
      cash_count: 'Kassensturz',
    };
    return types[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      income: 'bg-green-100 text-green-800',
      expense: 'bg-red-100 text-red-800',
      opening_balance: 'bg-blue-100 text-blue-800',
      cash_count: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const handleVerifyHashChain = async () => {
    if (!user) return;
    const result = await verifyHashChain(user.tenant_id);
    setHashVerification(result);
    setShowVerification(true);
  };

  const handleReceiptProcessed = (data: ReceiptData) => {
    console.log('Receipt processed:', data);
  };

  const handleAttachReceipt = async (entryId: string, receiptId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('cashbook_entries')
      .update({ receipt_id: receiptId })
      .eq('id', entryId)
      .eq('tenant_id', user.tenant_id);

    if (!error) {
      loadCashbook();
      setShowReceiptUpload(false);
      setSelectedEntryId(null);
    }
  };

  const exportToCsv = () => {
    const headers = ['Datum', 'Belegnummer', 'Typ', 'Beschreibung', 'Betrag', 'MwSt.', 'Kassenbestand'];
    const rows = filteredEntries.map(entry => [
      new Date(entry.entry_date).toLocaleDateString('de-DE'),
      entry.document_number,
      getTypeLabel(entry.document_type),
      entry.description,
      entry.amount.toFixed(2),
      entry.vat_rate.toFixed(2),
      entry.cash_balance.toFixed(2),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kassenbuch_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredEntries = entries.filter((entry) =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    balance: currentBalance,
    totalIncome: entries.filter(e => e.document_type === 'income').reduce((sum, e) => sum + e.amount, 0),
    totalExpense: entries.filter(e => e.document_type === 'expense').reduce((sum, e) => Math.abs(e.amount) + sum, 0),
    entryCount: entries.length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GoBD-Kassenbuch</h1>
            <p className="mt-1 text-sm text-gray-500">
              Revisionssicheres, GoBD-konformes Kassenbuch
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowMonthlyClosing(true)}
              className="inline-flex items-center px-4 py-2 border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Monatsabschluss
            </button>
            <button
              onClick={handleVerifyHashChain}
              className="inline-flex items-center px-4 py-2 border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
            >
              <Shield className="h-5 w-5 mr-2" />
              Prüfen
            </button>
            <button
              onClick={exportToCsv}
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
            <button
              onClick={() => window.location.href = '/cashbook/count'}
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Calculator className="h-5 w-5 mr-2" />
              Kassensturz
            </button>
            <button
              onClick={() => window.location.href = '/cashbook/new'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Neue Buchung
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Kassenbestand</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Einnahmen</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {stats.totalIncome.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ausgaben</p>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {stats.totalExpense.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <TrendingDown className="h-10 w-10 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Buchungen</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.entryCount}</p>
              </div>
              <Calculator className="h-10 w-10 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Hash Verification Result */}
        {showVerification && hashVerification && (
          <div className={`border-2 rounded-lg p-4 ${
            hashVerification.isValid ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <Shield className={`h-6 w-6 mt-0.5 mr-3 ${
                  hashVerification.isValid ? 'text-green-600' : 'text-red-600'
                }`} />
                <div>
                  <h3 className={`text-lg font-bold ${
                    hashVerification.isValid ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {hashVerification.isValid ? 'Kassenbuch ist korrekt' : 'Integritätsverletzung erkannt!'}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    hashVerification.isValid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {hashVerification.isValid
                      ? `Alle ${hashVerification.totalEntries} Einträge wurden erfolgreich verifiziert. Die Hash-Chain ist intakt.`
                      : `Hash-Chain unterbrochen bei Beleg: ${hashVerification.brokenAt}. ${hashVerification.verifiedEntries} von ${hashVerification.totalEntries} Einträgen verifiziert.`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVerification(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Monthly Closings Overview */}
        {monthlyClosings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              Letzte Monatsabschlüsse
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyClosings.map((closing) => (
                <div
                  key={closing.id}
                  className={`border-2 rounded-lg p-4 ${
                    closing.status === 'finalized'
                      ? 'border-green-200 bg-green-50'
                      : 'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900">
                      {closing.closing_month}/{closing.closing_year}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      closing.status === 'finalized'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {closing.status === 'finalized' ? 'Finalisiert' : 'Entwurf'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bestand:</span>
                      <span className="font-medium">
                        {parseFloat(closing.counted_balance).toLocaleString('de-DE', {
                          style: 'currency',
                          currency: 'EUR',
                          maximumFractionDigits: 0
                        })}
                      </span>
                    </div>
                    {Math.abs(parseFloat(closing.difference)) > 0.01 && (
                      <div className="flex justify-between text-red-600">
                        <span>Differenz:</span>
                        <span className="font-medium">
                          {parseFloat(closing.difference).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GoBD Compliance Badge */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">GoBD-konform</h3>
              <p className="mt-1 text-sm text-green-700">
                Dieses Kassenbuch erfüllt alle Anforderungen der GoBD (Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern).
                Alle Einträge sind mit Hash-Chains gesichert und unveränderlich.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Suche nach Beschreibung oder Nummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">Alle Vorgänge</option>
              <option value="income">Einnahmen</option>
              <option value="expense">Ausgaben</option>
              <option value="cash_count">Kassensturz</option>
            </select>
          </div>
        </div>

        {/* Entries list */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-500">Lade Kassenbuch...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center">
              <Calculator className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Keine Einträge gefunden</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm ? 'Versuchen Sie eine andere Suche.' : 'Erstellen Sie Ihre erste Kassenbuchung.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => window.location.href = '/cashbook/new'}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Erste Buchung erstellen
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Belegnummer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beschreibung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Betrag
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kassenbestand
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beleg
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.entry_date).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.document_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{entry.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(entry.document_type)}`}>
                          {getTypeLabel(entry.document_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${
                          entry.document_type === 'income' ? 'text-green-600' :
                          entry.document_type === 'expense' ? 'text-red-600' :
                          'text-gray-900'
                        }`}>
                          {entry.document_type === 'income' ? '+' : entry.document_type === 'expense' ? '-' : ''}
                          {Math.abs(entry.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {entry.cash_balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            setSelectedEntryId(entry.id);
                            setShowReceiptUpload(true);
                          }}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Anhängen
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setShowCancellation(true);
                          }}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Stornieren
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Receipt Upload Modal */}
        {showReceiptUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Beleg anhängen</h2>
                <button
                  onClick={() => {
                    setShowReceiptUpload(false);
                    setSelectedEntryId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <ReceiptUpload
                onReceiptProcessed={handleReceiptProcessed}
                onReceiptIdChange={(receiptId) => {
                  if (receiptId && selectedEntryId) {
                    handleAttachReceipt(selectedEntryId, receiptId);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {showCancellation && selectedEntry && (
          <CashbookCancellation
            entryId={selectedEntry.id}
            entry={selectedEntry}
            onClose={() => {
              setShowCancellation(false);
              setSelectedEntry(null);
            }}
            onSuccess={() => {
              setShowCancellation(false);
              setSelectedEntry(null);
              loadCashbook();
            }}
          />
        )}

        {/* Monthly Closing Modal */}
        {showMonthlyClosing && (
          <MonthlyClosing
            onClose={() => setShowMonthlyClosing(false)}
            onSuccess={() => {
              setShowMonthlyClosing(false);
              loadMonthlyClosings();
              loadCashbook();
            }}
          />
        )}
      </div>
    </Layout>
  );
}
