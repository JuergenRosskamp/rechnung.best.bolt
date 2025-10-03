import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

const quoteItemSchema = z.object({
  description: z.string().min(1, 'Beschreibung erforderlich'),
  quantity: z.coerce.number().min(0.001, 'Menge muss größer als 0 sein'),
  unit: z.string().default('pcs'),
  unit_price: z.coerce.number().min(0, 'Preis muss mindestens 0 sein'),
  vat_rate: z.coerce.number().min(0).max(100),
  discount_percentage: z.coerce.number().min(0).max(100).default(0),
});

const quoteSchema = z.object({
  customer_id: z.string().min(1, 'Kunde auswählen'),
  quote_date: z.string().min(1, 'Datum erforderlich'),
  valid_until: z.string().min(1, 'Gültigkeitsdatum erforderlich'),
  items: z.array(quoteItemSchema).min(1, 'Mindestens eine Position erforderlich'),
  notes: z.string().optional(),
});

type QuoteForm = z.infer<typeof quoteSchema>;

interface Customer {
  id: string;
  customer_number: string;
  display_name: string;
}

export function QuoteFormPage() {
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
  } = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      quote_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

  const calculateTotals = () => {
    let subtotal = 0;
    let vatAmount = 0;

    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
      const itemVat = itemSubtotal * (item.vat_rate / 100);
      subtotal += itemSubtotal;
      vatAmount += itemVat;
    });

    return {
      subtotal,
      vatAmount,
      total: subtotal + vatAmount,
    };
  };

  const totals = calculateTotals();

  const onSubmit = async (data: QuoteForm) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      // Generate quote number
      const { data: quoteNumber, error: numberError } = await supabase
        .rpc('generate_quote_number', { p_tenant_id: user.tenant_id });

      if (numberError) throw numberError;

      const { error: insertError } = await supabase
        .from('quotes')
        .insert({
          tenant_id: user.tenant_id,
          customer_id: data.customer_id,
          quote_number: quoteNumber,
          quote_date: data.quote_date,
          valid_until: data.valid_until,
          status: 'draft',
          items: data.items,
          subtotal: totals.subtotal,
          vat_amount: totals.vatAmount,
          total_amount: totals.total,
          notes: data.notes,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      window.location.href = '/quotes';
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg touch-target"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Neues Angebot</h1>
            <p className="text-sm text-gray-600 mt-1">Angebot erstellen</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stammdaten</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kunde *
                </label>
                <select
                  {...register('customer_id')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Bitte wählen...</option>
                  {customers.map(customer => (
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Angebotsdatum *
                </label>
                <input
                  type="date"
                  {...register('quote_date')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.quote_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.quote_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gültig bis *
                </label>
                <input
                  type="date"
                  {...register('valid_until')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.valid_until && (
                  <p className="mt-1 text-sm text-red-600">{errors.valid_until.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Positionen</h2>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 19, discount_percentage: 0 })}
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Position hinzufügen
              </button>
            </div>

            <div className="space-y-4 overflow-x-auto">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start min-w-max md:min-w-0">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      {...register(`items.${index}.description` as const)}
                      placeholder="Beschreibung"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.quantity` as const)}
                      placeholder="Menge"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.unit_price` as const)}
                      placeholder="Preis"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      {...register(`items.${index}.vat_rate` as const)}
                      placeholder="USt%"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg touch-target"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Zwischensumme:</span>
                <span className="font-medium">{totals.subtotal.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">MwSt:</span>
                <span className="font-medium">{totals.vatAmount.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Gesamtsumme:</span>
                <span>{totals.total.toFixed(2)} EUR</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anmerkungen
            </label>
            <textarea
              {...register('notes')}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Optional: Zusätzliche Hinweise..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {isLoading ? 'Speichern...' : 'Angebot speichern'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
