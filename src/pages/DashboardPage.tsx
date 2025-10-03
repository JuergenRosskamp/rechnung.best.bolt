import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { FileText, Users, Package, TrendingUp, AlertCircle, Calendar, Eye, Plus, ArrowRight, CheckCircle2, Clock, DollarSign } from 'lucide-react';

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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'purple';
  href?: string;
  sublabel?: string;
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, color, href, sublabel, loading }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400',
    green: 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400',
    orange: 'bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400',
    purple: 'bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400'
  };

  const Card = () => (
    <div className="card-hover group touch-target">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-2">{title}</p>
            {loading ? (
              <div className="skeleton h-9 w-24 mb-1" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-secondary-50 truncate mb-1">
                {value}
              </p>
            )}
            {sublabel && (
              <p className="text-xs text-secondary-500 dark:text-secondary-500">{sublabel}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {href && (
          <div className="mt-4 flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">
            Details anzeigen
            <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <a href={href} className="block">
      <Card />
    </a>
  ) : (
    <Card />
  );
}

function QuickActionButton({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center gap-3 p-5 bg-white dark:bg-secondary-800/50 rounded-2xl border-2 border-dashed border-secondary-300 dark:border-secondary-700/50 hover:border-primary-500 dark:hover:border-primary-500/50 hover:bg-primary-50 dark:hover:bg-primary-500/5 transition-all group touch-target"
    >
      <div className="p-3 bg-secondary-100 dark:bg-secondary-700/50 rounded-xl group-hover:bg-primary-100 dark:group-hover:bg-primary-500/20 transition-colors">
        <Icon className="w-6 h-6 text-secondary-600 dark:text-secondary-300 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
      </div>
      <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 group-hover:text-primary-700 dark:group-hover:text-primary-400">
        {label}
      </span>
    </a>
  );
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
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, status')
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null);

      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const pendingInvoices = invoices?.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length || 0;

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
      draft: 'bg-secondary-100 dark:bg-secondary-500/10 text-secondary-700 dark:text-secondary-300',
      sent: 'bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300',
      paid: 'bg-success-100 dark:bg-success-500/10 text-success-700 dark:text-success-300',
      overdue: 'bg-error-100 dark:bg-error-500/10 text-error-700 dark:text-error-300',
      partially_paid: 'bg-warning-100 dark:bg-warning-500/10 text-warning-700 dark:text-warning-300',
      cancelled: 'bg-secondary-100 dark:bg-secondary-500/10 text-secondary-600 dark:text-secondary-400',
    };
    return colors[status] || 'bg-secondary-100 dark:bg-secondary-500/10 text-secondary-700 dark:text-secondary-300';
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

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ElementType> = {
      draft: FileText,
      sent: Clock,
      paid: CheckCircle2,
      overdue: AlertCircle,
      partially_paid: DollarSign,
      cancelled: AlertCircle,
    };
    return icons[status] || FileText;
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
      <div className="space-y-6 pb-20 lg:pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-secondary-50">
            Dashboard
          </h1>
          {tenant && (
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              {tenant.company_name}
            </p>
          )}
        </div>

        {subscription?.status === 'trialing' && trialDaysLeft > 0 && (
          <div className="card border-primary-200 dark:border-primary-500/20 bg-primary-50 dark:bg-primary-500/5 animate-slide-down">
            <div className="p-4 sm:p-5 flex items-start gap-4">
              <div className="p-2 bg-primary-100 dark:bg-primary-500/10 rounded-lg flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-200 mb-1">
                  Testzeitraum aktiv
                </h3>
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Sie haben noch {trialDaysLeft} Tage in Ihrem kostenlosen Testzeitraum.
                  Genießen Sie alle Funktionen!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Kunden"
            value={isLoading ? '...' : stats.totalCustomers}
            icon={Users}
            color="blue"
            href="/customers"
            sublabel="Gesamt"
            loading={isLoading}
          />
          <StatCard
            title="Rechnungen"
            value={isLoading ? '...' : stats.totalInvoices}
            icon={FileText}
            color="green"
            href="/invoices"
            sublabel="Gesamt"
            loading={isLoading}
          />
          <StatCard
            title="Gesamtumsatz"
            value={isLoading ? '...' : stats.totalRevenue.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            })}
            icon={TrendingUp}
            color="purple"
            sublabel="Alle Rechnungen"
            loading={isLoading}
          />
          <StatCard
            title="Offene Rechnungen"
            value={isLoading ? '...' : stats.pendingInvoices}
            icon={AlertCircle}
            color="orange"
            href="/invoices?status=pending"
            sublabel="Zu bearbeiten"
            loading={isLoading}
          />
        </div>

        <div className="card">
          <div className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 mb-4">
              Schnellaktionen
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <QuickActionButton href="/invoices/new" icon={FileText} label="Neue Rechnung" />
              <QuickActionButton href="/customers/new" icon={Users} label="Neuer Kunde" />
              <QuickActionButton href="/articles/new" icon={Package} label="Neuer Artikel" />
            </div>
          </div>
        </div>

        {(recentInvoices.length > 0 || recentCustomers.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recentInvoices.length > 0 && (
              <div className="card">
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50">
                      Neueste Rechnungen
                    </h2>
                    <a
                      href="/invoices"
                      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 group"
                    >
                      Alle
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                  <div className="space-y-3">
                    {recentInvoices.map((invoice) => {
                      const StatusIcon = getStatusIcon(invoice.status);
                      return (
                        <a
                          key={invoice.id}
                          href={`/invoices/${invoice.id}`}
                          className="block p-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/30 rounded-xl transition-all border border-secondary-200 dark:border-secondary-700/50 hover:border-secondary-300 dark:hover:border-secondary-600/50 group touch-target"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 truncate">
                                  {invoice.invoice_number}
                                </p>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {getStatusLabel(invoice.status)}
                                </span>
                              </div>
                              <p className="text-sm text-secondary-600 dark:text-secondary-400 truncate mb-2">
                                {invoice.customer_name}
                              </p>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-secondary-400" />
                                <p className="text-xs text-secondary-500 dark:text-secondary-500">
                                  {new Date(invoice.invoice_date).toLocaleDateString('de-DE')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-secondary-900 dark:text-secondary-50 mb-1">
                                {invoice.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                              </p>
                              <Eye className="h-4 w-4 text-secondary-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {recentCustomers.length > 0 && (
              <div className="card">
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50">
                      Neueste Kunden
                    </h2>
                    <a
                      href="/customers"
                      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 group"
                    >
                      Alle
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                  <div className="space-y-3">
                    {recentCustomers.map((customer) => (
                      <a
                        key={customer.id}
                        href={`/customers/${customer.id}`}
                        className="block p-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/30 rounded-xl transition-all border border-secondary-200 dark:border-secondary-700/50 hover:border-secondary-300 dark:hover:border-secondary-600/50 group touch-target"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 truncate mb-1">
                                {getCustomerDisplayName(customer)}
                              </p>
                              <p className="text-xs text-secondary-500 dark:text-secondary-500 truncate">
                                {customer.customer_number}
                              </p>
                              {customer.email && (
                                <p className="text-xs text-secondary-400 dark:text-secondary-600 truncate mt-0.5">
                                  {customer.email}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-secondary-500 dark:text-secondary-500">
                                {new Date(customer.created_at).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                            <Eye className="h-4 w-4 text-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {stats.totalCustomers === 0 && stats.totalInvoices === 0 && !isLoading && (
          <div className="card">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-50 mb-6">
                Erste Schritte
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                      Firmendaten vervollständigen
                    </h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                      Fügen Sie Ihre vollständigen Firmendaten, Logo und Bankverbindung hinzu.
                    </p>
                    <a
                      href="/settings"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 group"
                    >
                      Zu den Einstellungen
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                      Ersten Kunden anlegen
                    </h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                      Erstellen Sie Ihren ersten Kundeneintrag mit allen wichtigen Informationen.
                    </p>
                    <a
                      href="/customers/new"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 group"
                    >
                      Kunde anlegen
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                      Erste Rechnung erstellen
                    </h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                      Erstellen Sie Ihre erste GoBD-konforme Rechnung mit wenigen Klicks.
                    </p>
                    <a
                      href="/invoices/new"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 group"
                    >
                      Rechnung erstellen
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
