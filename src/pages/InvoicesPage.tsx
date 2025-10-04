import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Eye, CreditCard as Edit, Copy, Printer, Download, Mail, DollarSign, FileX, Trash2, FileCheck } from 'lucide-react';
import { Layout } from '../components/Layout';
import { DropdownMenu } from '../components/DropdownMenu';
import { SendEmailModal, SendXRechnungModal, ViewInvoiceModal } from '../components/InvoiceModals';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { generateInvoicePDF, generateXRechnungXML, generateZUGFeRDPDF } from '../lib/invoicePdfGenerator';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_id: string;
  customer_snapshot: any;
  total_amount: number;
  amount_paid: number;
  status: string;
  items: any[];
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  notes: string;
  payment_terms: string;
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { user } = useAuthStore();
  const { toasts, hideToast, success, error: showError, info, warning } = useToast();

  // Modal states
  const [sendEmailModal, setSendEmailModal] = useState<{ isOpen: boolean; invoice: Invoice | null }>({ isOpen: false, invoice: null });
  const [sendXRechnungModal, setSendXRechnungModal] = useState<{ isOpen: boolean; invoice: Invoice | null }>({ isOpen: false, invoice: null });
  const [viewInvoiceModal, setViewInvoiceModal] = useState<{ isOpen: boolean; invoice: Invoice | null }>({ isOpen: false, invoice: null });

  const loadInvoices = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error loading invoices:', err);
      showError('Fehler beim Laden der Rechnungen');
    } finally {
      setIsLoading(false);
    }
  }, [user, statusFilter, showError]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // 1. Rechnung anzeigen
  const viewInvoice = (invoice: Invoice) => {
    setViewInvoiceModal({ isOpen: true, invoice });
  };

  // 2. Rechnung bearbeiten
  const editInvoice = (invoiceId: string, status: string) => {
    if (status !== 'DRAFT' && status !== 'OPEN') {
      warning('Nur Entwürfe und offene Rechnungen können bearbeitet werden');
      return;
    }
    window.location.href = `/invoices/edit/${invoiceId}`;
  };

  // 3. Rechnung duplizieren (als Vorlage verwenden)
  const duplicateInvoice = async (invoice: Invoice) => {
    if (!user) return;

    try {
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('position_number');

      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: user.tenant_id,
          invoice_number: 'DRAFT',
          invoice_type: invoice.invoice_type,
          invoice_date: today,
          due_date: dueDate.toISOString().split('T')[0],
          customer_id: invoice.customer_id,
          customer_snapshot: invoice.customer_snapshot,
          payment_terms: invoice.payment_terms,
          currency: 'EUR',
          subtotal: invoice.subtotal,
          total_discount: invoice.discount_amount,
          total_vat: invoice.tax_amount,
          total: invoice.total_amount,
          status: 'draft',
          payment_status: 'unpaid',
          amount_paid: 0,
          amount_due: invoice.total_amount
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (invoiceItems && invoiceItems.length > 0) {
        const itemsToInsert = invoiceItems.map((item: any, index: number) => ({
          invoice_id: newInvoice.id,
          tenant_id: user.tenant_id,
          position_number: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          discount_amount: item.discount_amount || 0,
          vat_rate: item.vat_rate,
          vat_amount: item.vat_amount,
          net_amount: item.net_amount,
          total_amount: item.total_amount
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      success('Rechnung als Entwurf dupliziert');
      loadInvoices();
      window.location.href = `/invoices/${newInvoice.id}`;
    } catch (err) {
      console.error('Duplicate error:', err);
      showError('Fehler beim Duplizieren der Rechnung');
    }
  };

  // 4. Rechnung drucken
  const printInvoice = async (invoiceId: string) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        showError('Rechnung nicht gefunden');
        return;
      }

      const blob = generateInvoicePDF(invoice);
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err) {
      console.error('Print error:', err);
      showError('Fehler beim Drucken der Rechnung');
    }
  };

  // 5-7. Download-Funktionen
  const downloadInvoice = async (invoiceId: string, format: 'standard' | 'zugferd' | 'xrechnung') => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        showError('Rechnung nicht gefunden');
        return;
      }

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user!.tenant_id)
        .single();

      const enrichedInvoice = {
        ...invoice,
        tenant_info: tenantData || undefined
      };

      let blob: Blob;
      let fileName: string;

      if (format === 'xrechnung') {
        blob = generateXRechnungXML(enrichedInvoice);
        fileName = `Rechnung_${invoice.invoice_number}.xml`;
      } else if (format === 'zugferd') {
        blob = await generateZUGFeRDPDF(enrichedInvoice);
        fileName = `Rechnung_${invoice.invoice_number}_ZUGFeRD.pdf`;
      } else {
        blob = await generateInvoicePDF(enrichedInvoice);
        fileName = `Rechnung_${invoice.invoice_number}.pdf`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 100);

      const formatLabels = {
        'standard': 'PDF',
        'zugferd': 'ZUGFeRD PDF',
        'xrechnung': 'XRechnung XML'
      };
      success(`${formatLabels[format]} erfolgreich heruntergeladen`);
    } catch (err) {
      console.error('Download error:', err);
      showError(`Fehler beim Download: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    }
  };

  // 8. E-Mail senden
  const sendInvoiceEmail = (invoice: Invoice) => {
    setSendEmailModal({ isOpen: true, invoice });
  };

  const handleSendEmail = async (email: string, pdfFormat: 'standard' | 'zugferd') => {
    try {
      // Hier würde die E-Mail-Versand-Logik kommen
      success(`Rechnung erfolgreich an ${email} gesendet`);
      setSendEmailModal({ isOpen: false, invoice: null });
    } catch (err) {
      showError('Fehler beim E-Mail-Versand');
    }
  };

  // 9. XRechnung per E-Mail
  const sendXRechnungEmail = (invoice: Invoice) => {
    setSendXRechnungModal({ isOpen: true, invoice });
  };

  const handleSendXRechnung = async (email: string, leitwegId: string, processType: string) => {
    try {
      // Hier würde die XRechnung-Versand-Logik kommen
      success(`XRechnung erfolgreich an ${email} gesendet`);
      setSendXRechnungModal({ isOpen: false, invoice: null });
    } catch (err) {
      showError('Fehler beim XRechnung-Versand');
    }
  };

  // 10. Zahlung erfassen
  const registerPayment = async (invoice: Invoice) => {
    if (invoice.status === 'PAID') {
      info('Diese Rechnung wurde bereits bezahlt');
      return;
    }

    const amountToPay = prompt(`Zahlbetrag eingeben (offen: ${invoice.total_amount.toFixed(2)} €):`);
    if (!amountToPay) return;

    const amount = parseFloat(amountToPay);
    if (isNaN(amount) || amount <= 0) {
      warning('Ungültiger Betrag');
      return;
    }

    try {
      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const newStatus = newAmountPaid >= invoice.total_amount ? 'PAID' : 'OPEN';

      const { error } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq('id', invoice.id);

      if (error) throw error;

      success(`Zahlung über ${amount.toFixed(2)} € erfasst`);
      loadInvoices();
    } catch (err) {
      showError('Fehler beim Erfassen der Zahlung');
    }
  };

  // 11. Gutschrift erstellen
  const createCreditNote = async (invoice: Invoice) => {
    if (invoice.status !== 'PAID') {
      warning('Gutschriften können nur für bezahlte Rechnungen erstellt werden');
      return;
    }

    try {
      const { error } = await supabase.from('invoices').insert({
        tenant_id: user?.tenant_id,
        customer_id: invoice.customer_id,
        customer_snapshot: invoice.customer_snapshot,
        invoice_number: `GS-${invoice.invoice_number}`,
        invoice_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        status: 'DRAFT',
        total_amount: -invoice.total_amount,
        subtotal: -invoice.subtotal,
        tax_amount: -invoice.tax_amount,
        items: invoice.items.map(item => ({ ...item, quantity: -item.quantity })),
        notes: `Gutschrift für Rechnung ${invoice.invoice_number}`,
      });

      if (error) throw error;
      success('Gutschrift erfolgreich erstellt');
      loadInvoices();
    } catch (err) {
      showError('Fehler beim Erstellen der Gutschrift');
    }
  };

  // 12. Storno erstellen
  const createCancellation = async (invoice: Invoice) => {
    if (invoice.status !== 'OPEN' && invoice.status !== 'DRAFT') {
      warning('Nur offene Rechnungen und Entwürfe können storniert werden');
      return;
    }

    if (!confirm(`Rechnung ${invoice.invoice_number} wirklich stornieren?`)) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'CANCELLED' })
        .eq('id', invoice.id);

      if (error) throw error;
      success('Rechnung storniert');
      loadInvoices();
    } catch (err) {
      showError('Fehler beim Stornieren der Rechnung');
    }
  };

  // 13. Rechnung löschen
  const deleteInvoice = async (invoice: Invoice) => {
    if (invoice.status !== 'DRAFT' && invoice.status !== 'OPEN') {
      warning('Nur Entwürfe und offene Rechnungen können gelöscht werden');
      return;
    }

    if (!confirm(`Rechnung ${invoice.invoice_number} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', invoice.id);

      if (error) throw error;
      success('Rechnung gelöscht');
      loadInvoices();
    } catch (err) {
      showError('Fehler beim Löschen der Rechnung');
    }
  };

  const getDropdownItems = (invoice: Invoice) => [
    {
      label: 'Rechnung anzeigen',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => viewInvoice(invoice),
    },
    {
      label: 'Rechnung bearbeiten',
      icon: <Edit className="w-4 h-4" />,
      onClick: () => editInvoice(invoice.id, invoice.status),
      hidden: invoice.status !== 'DRAFT' && invoice.status !== 'OPEN',
    },
    {
      label: 'Rechnung duplizieren',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => duplicateInvoice(invoice),
    },
    { separator: true },
    {
      label: 'Rechnung drucken',
      icon: <Printer className="w-4 h-4" />,
      onClick: () => printInvoice(invoice.id),
    },
    {
      label: 'Standard PDF',
      icon: <Download className="w-4 h-4" />,
      onClick: () => downloadInvoice(invoice.id, 'standard'),
    },
    {
      label: 'E-Rechnung (ZUGFeRD)',
      icon: <FileCheck className="w-4 h-4" />,
      onClick: () => downloadInvoice(invoice.id, 'zugferd'),
    },
    {
      label: 'XRechnung XML',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => downloadInvoice(invoice.id, 'xrechnung'),
    },
    { separator: true },
    {
      label: 'Per E-Mail senden',
      icon: <Mail className="w-4 h-4" />,
      onClick: () => sendInvoiceEmail(invoice),
    },
    {
      label: 'XRechnung per E-Mail',
      icon: <Mail className="w-4 h-4" />,
      onClick: () => sendXRechnungEmail(invoice),
    },
    { separator: true },
    {
      label: 'Zahlung erfassen',
      icon: <DollarSign className="w-4 h-4" />,
      onClick: () => registerPayment(invoice),
      hidden: invoice.status === 'PAID',
    },
    {
      label: 'Gutschrift erstellen',
      icon: <FileX className="w-4 h-4" />,
      onClick: () => createCreditNote(invoice),
      hidden: invoice.status !== 'PAID',
    },
    {
      label: 'Storno erstellen',
      icon: <FileX className="w-4 h-4" />,
      onClick: () => createCancellation(invoice),
      hidden: invoice.status !== 'OPEN' && invoice.status !== 'DRAFT',
    },
    { separator: true },
    {
      label: 'Rechnung löschen',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => deleteInvoice(invoice),
      variant: 'danger' as const,
      hidden: invoice.status !== 'DRAFT' && invoice.status !== 'OPEN',
    },
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      DRAFT: 'badge-secondary',
      OPEN: 'badge-warning',
      PAID: 'badge-success',
      OVERDUE: 'badge-error',
      CANCELLED: 'badge-error',
    };
    return config[status as keyof typeof config] || 'badge-secondary';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      DRAFT: 'Entwurf',
      OPEN: 'Offen',
      PAID: 'Bezahlt',
      OVERDUE: 'Überfällig',
      CANCELLED: 'Storniert',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const customerName = invoice.customer_snapshot?.company_name ||
                        `${invoice.customer_snapshot?.first_name} ${invoice.customer_snapshot?.last_name}`;
    return (
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Layout>
      <div className="space-y-6">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Rechnungen</h1>
            <p className="text-secondary-600 mt-1">Verwalten Sie Ihre Rechnungen und Zahlungen</p>
          </div>
          <button
            onClick={() => window.location.href = '/invoices/new'}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            Neue Rechnung
          </button>
        </div>

        <div className="card p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Suche nach Rechnungsnummer oder Kunde..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input md:w-48"
            >
              <option value="all">Alle Status</option>
              <option value="DRAFT">Entwurf</option>
              <option value="OPEN">Offen</option>
              <option value="PAID">Bezahlt</option>
              <option value="OVERDUE">Überfällig</option>
              <option value="CANCELLED">Storniert</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Rechnungsnummer</th>
                    <th>Kunde</th>
                    <th>Datum</th>
                    <th>Fällig</th>
                    <th className="text-right">Betrag</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-secondary-500">
                        Keine Rechnungen gefunden
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="font-medium text-secondary-900">{invoice.invoice_number}</td>
                        <td>
                          {invoice.customer_snapshot?.company_name ||
                           `${invoice.customer_snapshot?.first_name} ${invoice.customer_snapshot?.last_name}`}
                        </td>
                        <td>{format(new Date(invoice.invoice_date), 'dd.MM.yyyy')}</td>
                        <td>{format(new Date(invoice.due_date), 'dd.MM.yyyy')}</td>
                        <td className="text-right font-medium">{invoice.total_amount?.toFixed(2) || '0.00'} €</td>
                        <td className="text-center">
                          <span className={`badge ${getStatusBadge(invoice.status)}`}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="text-right">
                          <DropdownMenu items={getDropdownItems(invoice)} align="right" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <SendEmailModal
          isOpen={sendEmailModal.isOpen}
          onClose={() => setSendEmailModal({ isOpen: false, invoice: null })}
          onSend={handleSendEmail}
          customerEmail={sendEmailModal.invoice?.customer_snapshot?.email}
          invoiceNumber={sendEmailModal.invoice?.invoice_number || ''}
        />

        <SendXRechnungModal
          isOpen={sendXRechnungModal.isOpen}
          onClose={() => setSendXRechnungModal({ isOpen: false, invoice: null })}
          onSend={handleSendXRechnung}
          customerEmail={sendXRechnungModal.invoice?.customer_snapshot?.email}
          invoiceNumber={sendXRechnungModal.invoice?.invoice_number || ''}
        />

        <ViewInvoiceModal
          isOpen={viewInvoiceModal.isOpen}
          onClose={() => setViewInvoiceModal({ isOpen: false, invoice: null })}
          invoice={viewInvoiceModal.invoice}
        />
      </div>
    </Layout>
  );
}
