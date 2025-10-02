import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, DollarSign, Calculator } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

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

  useEffect(() => {
    loadCashbook();
  }, [loadCashbook]);

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
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/cashbook/count'}
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Calculator className="h-5 w-5 mr-2" />
              Kassensturz
            </button>
            <button
              onClick={() => window.location.href = '/cashbook/new'}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
