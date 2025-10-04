import { useState, useEffect } from 'react';
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, FileX, ArrowRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

interface Quote {
  id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  total_amount: number;
  customer: {
    display_name: string;
    customer_number: string;
  };
  converted_to_invoice_id: string | null;
}

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { user } = useAuthStore();

  useEffect(() => {
    loadQuotes();
  }, [user]);

  const loadQuotes = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers(display_name, customer_number)
        `)
        .eq('tenant_id', user.tenant_id)
        .order('quote_date', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertToInvoice = async (quoteId: string) => {
    if (!user) return;
    if (!confirm('Angebot in Rechnung umwandeln?')) return;

    try {
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) return;

      // Get quote details
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', { p_tenant_id: user.tenant_id });

      if (numberError) throw numberError;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: user.tenant_id,
          customer_id: quoteData.customer_id,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          items: quoteData.items,
          subtotal: quoteData.subtotal,
          vat_amount: quoteData.vat_amount,
          total_amount: quoteData.total_amount,
          payment_terms: 'net_30',
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update quote
      await supabase
        .from('quotes')
        .update({
          status: 'accepted',
          converted_to_invoice_id: invoice.id,
        })
        .eq('id', quoteId);

      loadQuotes();
      alert('Angebot wurde in Rechnung umgewandelt!');
      window.location.href = `/invoices/${invoice.id}`;
    } catch (error) {
      alert('Fehler: ' + getErrorMessage(error));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { color: 'bg-gray-100 dark:bg-secondary-700 text-gray-700 dark:text-secondary-200', icon: FileText, label: 'Entwurf' },
      sent: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Versendet' },
      accepted: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Angenommen' },
      declined: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Abgelehnt' },
      expired: { color: 'bg-orange-100 text-orange-700', icon: FileX, label: 'Abgelaufen' },
    };

    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch =
      quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customer.display_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-secondary-50">Angebote</h1>
            <p className="text-sm text-gray-600 dark:text-secondary-400 mt-1">Angebotsverwaltung und Konvertierung</p>
          </div>
          <button
            onClick={() => window.location.href = '/quotes/new'}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm touch-target"
          >
            <Plus className="h-5 w-5 mr-2" />
            Neues Angebot
          </button>
        </div>

        <div className="card mb-6">
          <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-secondary-600" />
                  <input
                    type="text"
                    placeholder="Angebotsnummer oder Kunde suchen..."
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
                  <option value="draft">Entwurf</option>
                  <option value="sent">Versendet</option>
                  <option value="accepted">Angenommen</option>
                  <option value="declined">Abgelehnt</option>
                  <option value="expired">Abgelaufen</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500 dark:text-secondary-500">Lade Angebote...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-secondary-600" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-secondary-50">Keine Angebote gefunden</h3>
            <p className="mt-2 text-gray-500 dark:text-secondary-500">
              {searchTerm ? 'Versuchen Sie eine andere Suche.' : 'Erstellen Sie Ihr erstes Angebot.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
              <thead className="bg-gray-50 dark:bg-secondary-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                    Angebotsnr.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                    Gültig bis
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                    Betrag
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50 dark:bg-secondary-800 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-secondary-50">{quote.quote_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-secondary-50">{quote.customer.display_name}</div>
                      <div className="text-xs text-gray-500 dark:text-secondary-500">{quote.customer.customer_number}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-secondary-50">
                      {new Date(quote.quote_date).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-secondary-50">
                      {new Date(quote.valid_until).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(quote.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-secondary-50">
                      {quote.total_amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => window.location.href = `/quotes/${quote.id}`}
                          className="text-blue-600 hover:text-blue-900 touch-target"
                          title="Anzeigen"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {quote.status === 'sent' && !quote.converted_to_invoice_id && (
                          <button
                            onClick={() => convertToInvoice(quote.id)}
                            className="text-green-600 hover:text-green-900 touch-target"
                            title="In Rechnung umwandeln"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
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
