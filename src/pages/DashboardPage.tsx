import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { FileText, Users, Package, TrendingUp, AlertCircle, Calendar, Eye } from 'lucide-react';

interface RecentInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total: number;
  status: string;
  customer_name: string;
}

interface RecentCustomer {
  id: string;
  customer_number: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
}

export function DashboardPage() {
  const { user, tenant, subscription } = useAuthStore();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      // Load customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null);

      // Load invoices count and revenue
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, status')
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null);

      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const pendingInvoices = invoices?.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length || 0;

      // Load recent invoices with customer names
      const { data: recentInvoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, due_date, total, status, customer_snapshot')
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentInvoicesData) {
        const formattedInvoices = recentInvoicesData.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          total: inv.total,
          status: inv.status,
          customer_name: (inv.customer_snapshot as any)?.company_name ||
                        `${(inv.customer_snapshot as any)?.first_name || ''} ${(inv.customer_snapshot as any)?.last_name || ''}`.trim() ||
                        'Unbekannt'
        }));
        setRecentInvoices(formattedInvoices);
      }

      // Load recent customers
      const { data: recentCustomersData } = await supabase
        .from('customers')
        .select('id, customer_number, company_name, first_name, last_name, email, created_at')
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentCustomersData) {
        setRecentCustomers(recentCustomersData);
      }

      setStats({
        totalCustomers: customersCount || 0,
        totalInvoices: invoices?.length || 0,
        totalRevenue,
        pendingInvoices,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Entwurf',
      sent: 'Versendet',
      paid: 'Bezahlt',
      overdue: 'Überfällig',
      partially_paid: 'Teilweise bezahlt',
      cancelled: 'Storniert',
    };
    return labels[status] || status;
  };

  const getCustomerDisplayName = (customer: RecentCustomer) => {
    if (customer.company_name) return customer.company_name;
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.customer_number;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen bei rechnung.best!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {tenant?.company_name}
          </p>
        </div>

        {/* Trial Banner */}
        {subscription?.status === 'trialing' && trialDaysLeft > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-indigo-900">
                  Testzeitraum aktiv
                </h3>
                <p className="mt-1 text-sm text-indigo-700">
                  Sie haben noch {trialDaysLeft} Tage in Ihrem kostenlosen Testzeitraum.
                  Genießen Sie alle Funktionen des rechnung.best Plans!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Kunden</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalCustomers}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4">
              <a href="/customers" className="text-sm text-indigo-600 hover:text-indigo-700">
                Kunden verwalten →
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Rechnungen</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalInvoices}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <a href="/invoices" className="text-sm text-green-600 hover:text-green-700">
                Rechnungen anzeigen →
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gesamtumsatz</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalRevenue.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  })}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">Alle Rechnungen</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Offen</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.pendingInvoices}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <a href="/invoices?status=pending" className="text-sm text-orange-600 hover:text-orange-700">
                Offene Rechnungen →
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Schnellaktionen</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.location.href = '/invoices/new'}
                className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <FileText className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Neue Rechnung</span>
              </button>

              <button
                onClick={() => window.location.href = '/customers/new'}
                className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <Users className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Neuer Kunde</span>
              </button>

              <button
                onClick={() => window.location.href = '/articles/new'}
                className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <Package className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Neuer Artikel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Grid */}
        {(recentInvoices.length > 0 || recentCustomers.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Invoices */}
            {recentInvoices.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Neueste Rechnungen</h2>
                    <a href="/invoices" className="text-sm text-indigo-600 hover:text-indigo-700">
                      Alle anzeigen →
                    </a>
                  </div>
                  <div className="space-y-3">
                    {recentInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                        onClick={() => window.location.href = `/invoices/${invoice.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {invoice.invoice_number}
                            </p>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                              {getStatusLabel(invoice.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{invoice.customer_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {new Date(invoice.invoice_date).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </p>
                          <Eye className="h-4 w-4 text-gray-400 ml-auto mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Customers */}
            {recentCustomers.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Neueste Kunden</h2>
                    <a href="/customers" className="text-sm text-indigo-600 hover:text-indigo-700">
                      Alle anzeigen →
                    </a>
                  </div>
                  <div className="space-y-3">
                    {recentCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                        onClick={() => window.location.href = `/customers/${customer.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getCustomerDisplayName(customer)}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {customer.customer_number}
                          </p>
                          {customer.email && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {customer.email}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex items-center">
                          <div className="text-right mr-3">
                            <p className="text-xs text-gray-500">
                              {new Date(customer.created_at).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                          <Eye className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Getting Started Guide */}
        {stats.totalCustomers === 0 && stats.totalInvoices === 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Erste Schritte</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-semibold">
                      1
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Firmendaten vervollständigen</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Fügen Sie Ihre vollständigen Firmendaten, Logo und Bankverbindung hinzu.
                    </p>
                    <a href="/settings" className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-700">
                      Zu den Einstellungen →
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-semibold">
                      2
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Ersten Kunden anlegen</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Erstellen Sie Ihren ersten Kundeneintrag mit allen wichtigen Informationen.
                    </p>
                    <a href="/customers/new" className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-700">
                      Kunde anlegen →
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-semibold">
                      3
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Erste Rechnung erstellen</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Erstellen Sie Ihre erste GoBD-konforme Rechnung mit wenigen Klicks.
                    </p>
                    <a href="/invoices/new" className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-700">
                      Rechnung erstellen →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
