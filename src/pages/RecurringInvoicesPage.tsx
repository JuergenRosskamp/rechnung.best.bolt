import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Pause, Play, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface RecurringInvoice {
  id: string;
  template_name: string;
  customer: {
    display_name: string;
    customer_number: string;
  };
  frequency: 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_invoice_date: string;
  total_amount: number;
  is_active: boolean;
  created_at: string;
}

interface MRRStats {
  mrr: number;
  arr: number;
  active_subscriptions: number;
  paused_subscriptions: number;
  churn_rate: number;
}

export function RecurringInvoicesPage() {
  const [subscriptions, setSubscriptions] = useState<RecurringInvoice[]>([]);
  const [stats, setStats] = useState<MRRStats>({
    mrr: 0,
    arr: 0,
    active_subscriptions: 0,
    paused_subscriptions: 0,
    churn_rate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { user } = useAuthStore();

  useEffect(() => {
    loadSubscriptions();
    calculateStats();
  }, [user]);

  const loadSubscriptions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('recurring_invoices')
        .select(`
          *,
          customer:customers(display_name, customer_number)
        `)
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = async () => {
    if (!user) return;

    try {
      // Get all active subscriptions
      const { data: active, error } = await supabase
        .from('recurring_invoices')
        .select('total_amount, frequency, is_active')
        .eq('tenant_id', user.tenant_id);

      if (error) throw error;

      let mrr = 0;
      let activeCount = 0;
      let pausedCount = 0;

      active?.forEach(sub => {
        if (sub.is_active) {
          activeCount++;
          // Normalize to monthly
          if (sub.frequency === 'monthly') {
            mrr += sub.total_amount;
          } else if (sub.frequency === 'quarterly') {
            mrr += sub.total_amount / 3;
          } else if (sub.frequency === 'yearly') {
            mrr += sub.total_amount / 12;
          }
        } else {
          pausedCount++;
        }
      });

      const arr = mrr * 12;

      // Calculate churn rate (simplified)
      const churnRate = pausedCount / (activeCount + pausedCount) * 100;

      setStats({
        mrr,
        arr,
        active_subscriptions: activeCount,
        paused_subscriptions: pausedCount,
        churn_rate: isNaN(churnRate) ? 0 : churnRate,
      });
    } catch (error) {
    }
  };

  const toggleStatus = async (subscriptionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .update({ is_active: !currentStatus })
        .eq('id', subscriptionId);

      if (error) throw error;

      loadSubscriptions();
      calculateStats();
    } catch (error) {
      alert('Fehler beim Ändern des Status');
    }
  };

  const deleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Abo wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      loadSubscriptions();
      calculateStats();
    } catch (error) {
      alert('Fehler beim Löschen');
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels = {
      monthly: 'Monatlich',
      quarterly: 'Quartalsweise',
      yearly: 'Jährlich',
    };
    return labels[freq as keyof typeof labels] || freq;
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch =
      sub.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer.display_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && sub.is_active) ||
      (statusFilter === 'paused' && !sub.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-secondary-50">Wiederkehrende Rechnungen</h1>
            <p className="text-sm text-gray-600 dark:text-secondary-400 mt-1">Abo-Verwaltung & Recurring Revenue</p>
          </div>
          <button
            onClick={() => window.location.href = '/recurring-invoices/new'}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm touch-target"
          >
            <Plus className="h-5 w-5 mr-2" />
            Neues Abo
          </button>
        </div>

        {/* MRR/ARR Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">MRR</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {stats.mrr.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-blue-600 mt-1">Monthly Recurring Revenue</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="card p-4 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">ARR</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {stats.arr.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-green-600 mt-1">Annual Recurring Revenue</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="card p-4">
            <p className="text-sm text-gray-600 dark:text-secondary-400 font-medium">Aktive Abos</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-secondary-50 mt-1">{stats.active_subscriptions}</p>
          </div>

          <div className="card p-4">
            <p className="text-sm text-gray-600 dark:text-secondary-400 font-medium">Pausiert</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{stats.paused_subscriptions}</p>
          </div>

          <div className="card p-4">
            <p className="text-sm text-gray-600 dark:text-secondary-400 font-medium">Churn Rate</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{stats.churn_rate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-secondary-600" />
                  <input
                    type="text"
                    placeholder="Abo-Name oder Kunde suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Alle Status</option>
                  <option value="active">Aktiv</option>
                  <option value="paused">Pausiert</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500 dark:text-secondary-500">Lade Abos...</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 dark:text-secondary-600" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-secondary-50">Keine Abos gefunden</h3>
            <p className="mt-2 text-gray-500 dark:text-secondary-500">
              {searchTerm ? 'Versuchen Sie eine andere Suche.' : 'Erstellen Sie Ihr erstes Abo.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
              <thead className="bg-gray-50 dark:bg-secondary-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Abo-Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Kunde
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Frequenz
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Nächste Rechnung
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Betrag
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 dark:bg-secondary-800 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-secondary-50">{sub.template_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-secondary-50">{sub.customer.display_name}</div>
                      <div className="text-xs text-gray-500 dark:text-secondary-500">{sub.customer.customer_number}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-secondary-50">
                      {getFrequencyLabel(sub.frequency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-secondary-50">
                      {new Date(sub.next_invoice_date).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-secondary-50">
                      {sub.total_amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {sub.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Play className="h-3 w-3 mr-1" />
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          <Pause className="h-3 w-3 mr-1" />
                          Pausiert
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleStatus(sub.id, sub.is_active)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg touch-target"
                          title={sub.is_active ? 'Pausieren' : 'Aktivieren'}
                        >
                          {sub.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => deleteSubscription(sub.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg touch-target"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
