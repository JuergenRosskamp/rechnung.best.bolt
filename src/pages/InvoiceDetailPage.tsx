import { useState, useEffect, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft, Download, Send, DollarSign, Printer, CreditCard as Edit, CheckCircle, Lock } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import { finalizeInvoice, archiveInvoicePdf } from '../lib/invoiceArchive';
import { generateInvoicePDF } from '../lib/invoicePdfGenerator';

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  delivery_date?: string;
  customer_snapshot: any;
  items: any[];
  subtotal: number;
  total_vat: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  payment_status: string;
  payment_terms: string;
  reference_number: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  created_at: string;
  finalized_at?: string | null;
  layout_snapshot?: any;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  notes: string | null;
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams({ strict: false }) as { invoiceId?: string };
  const { user, tenant } = useAuthStore();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'bank_transfer',
    reference: '',
    notes: ''
  });

  const loadInvoiceDetails = useCallback(async () => {
    if (!user || !invoiceId) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setInvoice(data as InvoiceDetail);
        setPaymentForm(prev => ({
          ...prev,
          amount: data.amount_due
        }));
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, invoiceId, setPaymentForm]);

  const loadPayments = useCallback(async () => {
    if (!user || !invoiceId) return;

    try {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('tenant_id', user.tenant_id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  }, [user, invoiceId]);

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceDetails();
      loadPayments();
    }
  }, [invoiceId, loadInvoiceDetails, loadPayments]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !invoice) return;

    try {
      const { error } = await supabase
        .from('invoice_payments')
        .insert([{
          tenant_id: user.tenant_id,
          invoice_id: invoice.id,
          payment_date: paymentForm.payment_date,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          reference: paymentForm.reference || null,
          notes: paymentForm.notes || null,
          recorded_by: user.id
        }]);

      if (error) throw error;

      const newAmountPaid = invoice.amount_paid + paymentForm.amount;
      const newAmountDue = invoice.total - newAmountPaid;
      const newPaymentStatus = newAmountDue <= 0 ? 'paid' : newAmountDue < invoice.total ? 'partially_paid' : 'unpaid';
      const newStatus = newPaymentStatus === 'paid' ? 'paid' : invoice.status;

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          payment_status: newPaymentStatus,
          status: newStatus
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      setShowPaymentModal(false);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: 'bank_transfer',
        reference: '',
        notes: ''
      });

      await loadInvoiceDetails();
      await loadPayments();
    } catch (error: unknown) {
      alert('Fehler beim Erfassen der Zahlung: ' + getErrorMessage(error));
    }
  };

  const handleFinalizeInvoice = async () => {
    if (!invoice || !user) return;

    if (invoice.finalized_at) {
      alert('Diese Rechnung ist bereits finalisiert und kann nicht mehr geändert werden.');
      return;
    }

    if (!confirm('Möchten Sie diese Rechnung finalisieren? Nach der Finalisierung kann die Rechnung nicht mehr geändert werden (GoBD-Konformität).')) {
      return;
    }

    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user.tenant_id)
        .single();

      const enrichedInvoice = {
        ...invoice,
        tax_amount: invoice.total_vat,
        total_amount: invoice.total,
        discount_amount: 0,
        tax_rate: 19,
        tenant_info: tenantData || undefined
      };

      const pdfBlob = await generateInvoicePDF(enrichedInvoice);

      const archiveResult = await archiveInvoicePdf(invoice.id, pdfBlob, 'standard');

      if (!archiveResult.success) {
        throw new Error(archiveResult.error || 'Fehler bei der Archivierung');
      }

      const finalizeResult = await finalizeInvoice(invoice.id);

      if (!finalizeResult.success) {
        throw new Error(finalizeResult.error || 'Fehler bei der Finalisierung');
      }

      alert('Rechnung wurde erfolgreich finalisiert und archiviert!');
      await loadInvoiceDetails();
    } catch (error: unknown) {
      alert('Fehler beim Finalisieren: ' + getErrorMessage(error));
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-secondary-700 text-gray-800 dark:text-secondary-100',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 dark:bg-secondary-700 text-gray-600 dark:text-secondary-400',
    };
    const labels: Record<string, string> = {
      draft: 'Entwurf',
      sent: 'Versendet',
      paid: 'Bezahlt',
      overdue: 'Überfällig',
      partially_paid: 'Teilweise bezahlt',
      cancelled: 'Storniert',
    };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || colors.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: 'Überweisung',
      cash: 'Bar',
      card: 'Karte',
      sepa: 'SEPA Lastschrift',
      paypal: 'PayPal',
      other: 'Sonstiges'
    };
    return labels[method] || method;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600 dark:text-secondary-400">Lade Rechnung...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-secondary-500">Rechnung nicht gefunden</p>
          <button
            onClick={() => window.location.href = '/invoices'}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </Layout>
    );
  }

  const customerName = invoice.customer_snapshot?.company_name ||
    `${invoice.customer_snapshot?.first_name || ''} ${invoice.customer_snapshot?.last_name || ''}`.trim();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/invoices'}
              className="p-2 hover:bg-gray-100 dark:bg-secondary-700 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-secondary-50">
                {invoice.invoice_number}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-secondary-500">{customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(invoice.status)}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2">
            {invoice.finalized_at && (
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <Lock className="h-4 w-4 mr-2" />
                Finalisiert am {new Date(invoice.finalized_at).toLocaleDateString('de-DE')}
              </div>
            )}
            {!invoice.finalized_at && invoice.status !== 'cancelled' && (
              <button
                onClick={handleFinalizeInvoice}
                className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
              >
                <Lock className="h-4 w-4 mr-2" />
                Rechnung finalisieren (GoBD)
              </button>
            )}
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800">
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800">
              <Send className="h-4 w-4 mr-2" />
              Versenden
            </button>
            {invoice.amount_due > 0 && invoice.status !== 'cancelled' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Zahlung erfassen
              </button>
            )}
            {!invoice.finalized_at && (
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800">
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </button>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Main Invoice Card */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow">
              <div className="p-6 space-y-6">
                {/* Addresses */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-secondary-500 mb-2">Von</h3>
                    <div className="text-sm">
                      <p className="font-medium">{tenant?.company_name}</p>
                      {tenant?.address_line1 && <p>{tenant.address_line1}</p>}
                      {tenant?.zip_code && tenant?.city && (
                        <p>{tenant.zip_code} {tenant.city}</p>
                      )}
                      {tenant?.phone && <p>Tel: {tenant.phone}</p>}
                      {tenant?.email && <p>E-Mail: {tenant.email}</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-secondary-500 mb-2">An</h3>
                    <div className="text-sm">
                      <p className="font-medium">{customerName}</p>
                      {invoice.customer_snapshot?.address_line1 && (
                        <p>{invoice.customer_snapshot.address_line1}</p>
                      )}
                      {invoice.customer_snapshot?.zip_code && invoice.customer_snapshot?.city && (
                        <p>{invoice.customer_snapshot.zip_code} {invoice.customer_snapshot.city}</p>
                      )}
                      {invoice.customer_snapshot?.email && (
                        <p>E-Mail: {invoice.customer_snapshot.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Info */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-secondary-500">Rechnungsdatum</p>
                    <p className="text-sm font-medium">
                      {new Date(invoice.invoice_date).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-secondary-500">Fälligkeitsdatum</p>
                    <p className="text-sm font-medium">
                      {new Date(invoice.due_date).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  {invoice.reference_number && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-secondary-500">Referenznummer</p>
                      <p className="text-sm font-medium">{invoice.reference_number}</p>
                    </div>
                  )}
                  {invoice.payment_terms && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-secondary-500">Zahlungsbedingungen</p>
                      <p className="text-sm font-medium">{invoice.payment_terms}</p>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div className="pt-4 border-t">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left text-sm font-medium text-gray-500 dark:text-secondary-500">Position</th>
                        <th className="py-2 text-right text-sm font-medium text-gray-500 dark:text-secondary-500">Menge</th>
                        <th className="py-2 text-right text-sm font-medium text-gray-500 dark:text-secondary-500">Einzelpreis</th>
                        <th className="py-2 text-right text-sm font-medium text-gray-500 dark:text-secondary-500">MwSt.</th>
                        <th className="py-2 text-right text-sm font-medium text-gray-500 dark:text-secondary-500">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="py-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-secondary-50">{item.description}</p>
                            {item.unit && (
                              <p className="text-xs text-gray-500 dark:text-secondary-500">Einheit: {item.unit}</p>
                            )}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-900 dark:text-secondary-50">
                            {item.quantity}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-900 dark:text-secondary-50">
                            {item.unit_price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-900 dark:text-secondary-50">
                            {item.vat_rate}%
                          </td>
                          <td className="py-3 text-right text-sm font-medium text-gray-900 dark:text-secondary-50">
                            {item.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-secondary-500">Zwischensumme</span>
                      <span className="font-medium">
                        {invoice.subtotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-secondary-500">MwSt.</span>
                      <span className="font-medium">
                        {invoice.total_vat.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Gesamtbetrag</span>
                      <span>{invoice.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    {invoice.amount_paid > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Bezahlt</span>
                          <span>
                            -{invoice.amount_paid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-orange-600">
                          <span>Noch offen</span>
                          <span>
                            {invoice.amount_due.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {invoice.customer_notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-gray-900 dark:text-secondary-50 mb-2">Notizen für Kunden</p>
                    <p className="text-sm text-gray-600 dark:text-secondary-400">{invoice.customer_notes}</p>
                  </div>
                )}

                {/* Bank Details */}
                {tenant?.iban && (
                  <div className="pt-4 border-t bg-gray-50 dark:bg-secondary-800 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-secondary-50 mb-2">Zahlungsinformationen</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {tenant.bank_account_holder && (
                        <div>
                          <span className="text-gray-500 dark:text-secondary-500">Kontoinhaber: </span>
                          <span className="font-medium">{tenant.bank_account_holder}</span>
                        </div>
                      )}
                      {tenant.bank_name && (
                        <div>
                          <span className="text-gray-500 dark:text-secondary-500">Bank: </span>
                          <span className="font-medium">{tenant.bank_name}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 dark:text-secondary-500">IBAN: </span>
                        <span className="font-mono font-medium">{tenant.iban}</span>
                      </div>
                      {tenant.bic && (
                        <div>
                          <span className="text-gray-500 dark:text-secondary-500">BIC: </span>
                          <span className="font-mono font-medium">{tenant.bic}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment History */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-secondary-50 mb-4">Zahlungshistorie</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-secondary-500 italic">Keine Zahlungen erfasst</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="border-l-4 border-green-500 pl-3 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-secondary-50">
                            {payment.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-secondary-500">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </p>
                          {payment.reference && (
                            <p className="text-xs text-gray-500 dark:text-secondary-500">Ref: {payment.reference}</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-secondary-500">
                          {new Date(payment.payment_date).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-gray-600 dark:text-secondary-400 mt-1">{payment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-secondary-50 mb-4">Verlauf</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary-600"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-secondary-50">Rechnung erstellt</p>
                    <p className="text-xs text-gray-500 dark:text-secondary-500">
                      {new Date(invoice.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
                {invoice.status === 'paid' && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-green-600"></div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-secondary-50">Vollständig bezahlt</p>
                      <p className="text-xs text-gray-500 dark:text-secondary-500">
                        {payments.length > 0 && new Date(payments[0].payment_date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-secondary-50 mb-4">Zahlung erfassen</h2>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Zahlungsdatum *
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Betrag * (Offen: {invoice.amount_due.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  max={invoice.amount_due}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Zahlungsmethode *
                </label>
                <select
                  required
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="bank_transfer">Überweisung</option>
                  <option value="cash">Bar</option>
                  <option value="card">Karte</option>
                  <option value="sepa">SEPA Lastschrift</option>
                  <option value="paypal">PayPal</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Referenz
                </label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="z.B. Transaktionsnummer"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Notizen
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Zahlung erfassen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
