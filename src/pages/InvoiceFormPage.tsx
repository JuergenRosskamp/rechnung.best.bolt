import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Beschreibung erforderlich'),
  quantity: z.coerce.number().min(0.001, 'Menge muss größer als 0 sein'),
  unit: z.string().default('pcs'),
  unit_price: z.coerce.number().min(0, 'Preis muss mindestens 0 sein'),
  vat_rate: z.coerce.number().min(0).max(100),
  discount_percentage: z.coerce.number().min(0).max(100).default(0),
});

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Kunde auswählen'),
  invoice_date: z.string()
    .min(1, 'Datum erforderlich')
    .refine((date) => {
      const invoiceDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return invoiceDate <= today;
    }, 'Rechnungsdatum darf nicht in der Zukunft liegen'),
  due_date: z.string().min(1, 'Fälligkeitsdatum erforderlich'),
  payment_terms: z.string().default('net_30'),
  reference_number: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Mindestens eine Position erforderlich').refine(
    (items) => items.some(item => item.description.trim() !== ''),
    'Mindestens eine Position mit Beschreibung erforderlich'
  ),
  internal_notes: z.string().optional(),
  customer_notes: z.string().optional(),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

interface Customer {
  id: string;
  customer_number: string;
  display_name: string;
}

export function InvoiceFormPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { user } = useAuthStore();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_terms: 'net_30',
      items: [
        { description: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 19, discount_percentage: 0 }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');

  const loadCustomers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_number, display_name')
        .eq('tenant_id', user.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('customer_number');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }, [user]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const calculateItemTotal = (index: number) => {
    const item = items[index];
    if (!item) return { net: 0, vat: 0, gross: 0 };

    const subtotal = item.quantity * item.unit_price;
    const discountAmount = (subtotal * (item.discount_percentage || 0)) / 100;
    const netAmount = subtotal - discountAmount;
    const vatAmount = (netAmount * item.vat_rate) / 100;
    const grossAmount = netAmount + vatAmount;

    return {
      net: netAmount,
      vat: vatAmount,
      gross: grossAmount,
    };
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalVat = 0;
    let total = 0;

    items.forEach((_, index) => {
      const itemTotal = calculateItemTotal(index);
      subtotal += itemTotal.net;
      totalVat += itemTotal.vat;
      total += itemTotal.gross;
    });

    return { subtotal, totalVat, total };
  };

  const totals = calculateTotals();

  const onSubmit = async (data: InvoiceForm) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      // Get next invoice number
      const { data: numberData, error: numberError } = await supabase
        .rpc('get_next_invoice_number', {
          p_tenant_id: user.tenant_id,
        });

      if (numberError) throw numberError;

      // Get customer data for snapshot
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', data.customer_id)
        .single();

      if (customerError) throw customerError;

      // Get current layout for snapshot (GoBD requirement)
      const { data: layoutData } = await supabase
        .from('invoice_layouts')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('is_default', true)
        .single();

      // Create invoice with layout snapshot
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: user.tenant_id,
          invoice_number: numberData,
          customer_id: data.customer_id,
          customer_snapshot: customerData,
          layout_snapshot: layoutData || null,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          payment_terms: data.payment_terms,
          reference_number: data.reference_number,
          subtotal: totals.subtotal,
          total_vat: totals.totalVat,
          total: totals.total,
          internal_notes: data.internal_notes,
          customer_notes: data.customer_notes,
          status: 'draft',
          payment_status: 'unpaid',
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = data.items.map((item, index) => {
        const itemTotal = calculateItemTotal(index);
        return {
          invoice_id: invoiceData.id,
          tenant_id: user.tenant_id,
          position_number: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          discount_amount: (item.quantity * item.unit_price * (item.discount_percentage || 0)) / 100,
          vat_rate: item.vat_rate,
          vat_amount: itemTotal.vat,
          net_amount: itemTotal.net,
          total_amount: itemTotal.gross,
        };
      });

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Redirect to invoice detail
      window.location.href = `/invoices/${invoiceData.id}`;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Fehler beim Erstellen der Rechnung');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/invoices'}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Neue Rechnung</h1>
            <p className="mt-1 text-sm text-gray-500">
              Erstellen Sie eine neue Rechnung
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Header */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Rechnungsdetails</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Kunde *
                </label>
                <select
                  {...register('customer_id')}
                  id="customer_id"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Kunde auswählen</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_number} - {customer.display_name}
                    </option>
                  ))}
                </select>
                {errors.customer_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700 mb-2">
                  Zahlungsziel
                </label>
                <select
                  {...register('payment_terms')}
                  id="payment_terms"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="immediately">Sofort fällig</option>
                  <option value="net_7">7 Tage netto</option>
                  <option value="net_14">14 Tage netto</option>
                  <option value="net_30">30 Tage netto</option>
                  <option value="net_60">60 Tage netto</option>
                </select>
              </div>

              <div>
                <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Rechnungsdatum *
                </label>
                <input
                  {...register('invoice_date')}
                  type="date"
                  id="invoice_date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.invoice_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoice_date.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Fälligkeitsdatum *
                </label>
                <input
                  {...register('due_date')}
                  type="date"
                  id="due_date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.due_date.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Referenznummer
                </label>
                <input
                  {...register('reference_number')}
                  type="text"
                  id="reference_number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Positionen</h2>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 19, discount_percentage: 0 })}
                className="inline-flex items-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Position hinzufügen
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const itemTotal = calculateItemTotal(index);
                return (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Position {index + 1}</h3>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Beschreibung *
                        </label>
                        <input
                          {...register(`items.${index}.description`)}
                          type="text"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Artikelbezeichnung"
                        />
                        {errors.items?.[index]?.description && (
                          <p className="mt-1 text-xs text-red-600">{errors.items[index]?.description?.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Menge *
                        </label>
                        <input
                          {...register(`items.${index}.quantity`)}
                          type="number"
                          step="0.01"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Einzelpreis (€) *
                        </label>
                        <input
                          {...register(`items.${index}.unit_price`)}
                          type="number"
                          step="0.01"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          MwSt. (%)
                        </label>
                        <select
                          {...register(`items.${index}.vat_rate`)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="0">0%</option>
                          <option value="7">7%</option>
                          <option value="19">19%</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Gesamt
                        </label>
                        <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg font-medium">
                          {itemTotal.gross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Zwischensumme (netto):</span>
                    <span className="font-medium">{totals.subtotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">MwSt.:</span>
                    <span className="font-medium">{totals.totalVat.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Gesamtsumme:</span>
                    <span>{totals.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Notizen</h2>

            <div>
              <label htmlFor="customer_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Kundennotizen (erscheinen auf der Rechnung)
              </label>
              <textarea
                {...register('customer_notes')}
                id="customer_notes"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="z.B. Zahlungshinweise, Lieferbedingungen..."
              />
            </div>

            <div>
              <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Interne Notizen (nicht auf der Rechnung)
              </label>
              <textarea
                {...register('internal_notes')}
                id="internal_notes"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Nur für interne Zwecke..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => window.location.href = '/invoices'}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {isLoading ? 'Erstellt...' : 'Rechnung erstellen'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
