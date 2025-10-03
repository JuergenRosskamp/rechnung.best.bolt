import { useState, useEffect } from 'react';
import { AlertTriangle, FileText, Send, CheckCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

interface Dunning {
  id: string;
  dunning_number: string;
  dunning_date: string;
  due_date: string;
  dunning_level: number;
  status: 'draft' | 'sent' | 'paid' | 'escalated';
  total_amount: number;
  outstanding_amount: number;
  dunning_fee: number;
  interest_amount: number;
  invoice: {
    invoice_number: string;
  };
  customer: {
    display_name: string;
  };
}

export function DunningPage() {
  const [dunnings, setDunnings] = useState<Dunning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    loadDunnings();
  }, [user]);

  const loadDunnings = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('dunning_notices')
        .select(`
          *,
          invoice:invoices(invoice_number),
          customer:customers(display_name)
        `)
        .eq('tenant_id', user.tenant_id)
        .order('dunning_date', { ascending: false });

      if (error) throw error;
      setDunnings(data || []);
    } catch (error) {
      console.error('Error loading dunnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDunnings = async () => {
    if (!user) return;
    if (!confirm('Mahnungen für überfällige Rechnungen erstellen?')) return;

    try {
      setIsGenerating(true);
      const { error } = await supabase.rpc('check_overdue_invoices');

      if (error) throw error;

      alert('Mahnungen wurden erfolgreich erstellt!');
      loadDunnings();
    } catch (error) {
      alert('Fehler: ' + getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const sendDunning = async (dunningId: string) => {
    if (!confirm('Mahnung versenden?')) return;

    try {
      const { error } = await supabase
        .from('dunning_notices')
        .update({ status: 'sent' })
        .eq('id', dunningId);

      if (error) throw error;

      alert('Mahnung wurde versendet!');
      loadDunnings();
    } catch (error) {
      alert('Fehler: ' + getErrorMessage(error));
    }
  };

  const getLevelBadge = (level: number) => {
    const badges = {
      1: { color: 'bg-yellow-100 text-yellow-800', label: '1. Mahnung' },
      2: { color: 'bg-orange-100 text-orange-800', label: '2. Mahnung' },
      3: { color: 'bg-red-100 text-red-800', label: '3. Mahnung' },
    };

    const badge = badges[level as keyof typeof badges];
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: FileText, label: 'Entwurf' },
      sent: { color: 'bg-blue-100 text-blue-700', icon: Send, label: 'Versendet' },
      paid: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Bezahlt' },
      escalated: { color: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'Eskaliert' },
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

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mahnwesen</h1>
            <p className="text-sm text-gray-600 mt-1">Zahlungserinnerungen und Mahnungen</p>
          </div>
          <button
            onClick={generateDunnings}
            disabled={isGenerating}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm disabled:opacity-50 touch-target"
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            {isGenerating ? 'Erstelle...' : 'Mahnungen erstellen'}
          </button>
        </div>

        <div className="card mb-6 p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Automatisches Mahnwesen</h3>
              <p className="text-sm text-blue-800 mt-1">
                Das System prüft automatisch überfällige Rechnungen und erstellt Mahnungen nach folgendem Schema:
              </p>
              <ul className="mt-2 text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>1. Mahnung:</strong> 7 Tage nach Fälligkeit (5,00 EUR Gebühr)</li>
                <li><strong>2. Mahnung:</strong> 21 Tage nach Fälligkeit (10,00 EUR Gebühr + 5% Zinsen)</li>
                <li><strong>3. Mahnung:</strong> 42 Tage nach Fälligkeit (15,00 EUR Gebühr + 9% Zinsen)</li>
              </ul>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-4 text-gray-500">Lade Mahnungen...</p>
          </div>
        ) : dunnings.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Keine offenen Mahnungen</h3>
            <p className="mt-2 text-gray-500">
              Alle Rechnungen sind bezahlt oder noch nicht fällig.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mahnnummer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rechnung
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kunde
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stufe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Betrag
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dunnings.map((dunning) => (
                  <tr key={dunning.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{dunning.dunning_number}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dunning.invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{dunning.customer.display_name}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getLevelBadge(dunning.dunning_level)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(dunning.dunning_date).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(dunning.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {dunning.total_amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        Gebühr: {dunning.dunning_fee.toFixed(2)} EUR
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {dunning.status === 'draft' && (
                        <button
                          onClick={() => sendDunning(dunning.id)}
                          className="text-blue-600 hover:text-blue-900 touch-target"
                          title="Versenden"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
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
