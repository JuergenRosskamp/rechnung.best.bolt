import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

const customerSchema = z.object({
  company_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address_line1: z.string().min(1, 'Adresse ist erforderlich'),
  address_line2: z.string().optional(),
  zip_code: z.string().min(1, 'PLZ ist erforderlich'),
  city: z.string().min(1, 'Stadt ist erforderlich'),
  country: z.string().default('DE'),
  tax_id: z.string().optional(),
  vat_id: z.string().optional(),
  customer_type: z.enum(['b2b', 'b2c', 'b2g']).default('b2b'),
  payment_terms: z.string().default('net_30'),
  discount_percentage: z.coerce.number().min(0).max(100).default(0),
  internal_notes: z.string().optional(),
  customer_notes: z.string().optional(),
}).refine((data) => data.company_name || (data.first_name && data.last_name), {
  message: 'Entweder Firmenname oder Vor- und Nachname sind erforderlich',
  path: ['company_name'],
});

type CustomerForm = z.infer<typeof customerSchema>;

export function CustomerFormPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      country: 'DE',
      customer_type: 'b2b',
      payment_terms: 'net_30',
      discount_percentage: 0,
    },
  });

  const customerType = watch('customer_type');

  const loadCustomer = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Populate form
      Object.keys(data).forEach((key) => {
        setValue(key as any, data[key]);
      });
    } catch (error) {
      console.error('Error loading customer:', error);
      setError('Fehler beim Laden des Kunden');
    }
  }, [setValue]);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id !== 'new' && id !== 'customers') {
      setCustomerId(id);
      loadCustomer(id);
    }
  }, [loadCustomer]);

  const onSubmit = async (data: CustomerForm) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      // Generate customer number if new
      let customerNumber = '';
      if (!customerId) {
        const { count } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.tenant_id);

        customerNumber = `K${String((count || 0) + 1).padStart(5, '0')}`;
      }

      const customerData = {
        ...data,
        tenant_id: user.tenant_id,
        customer_number: customerNumber || undefined,
        created_by: user.id,
      };

      if (customerId) {
        // Update existing
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customerId);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('customers')
          .insert(customerData);

        if (insertError) throw insertError;
      }

      // Redirect to customers list
      window.location.href = '/customers';
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Fehler beim Speichern des Kunden');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/customers'}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customerId ? 'Kunde bearbeiten' : 'Neuer Kunde'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Erfassen Sie alle relevanten Kundendaten
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
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Grundinformationen</h2>

            {/* Customer Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kundentyp *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    {...register('customer_type')}
                    type="radio"
                    value="b2b"
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">B2B (Geschäftskunde)</span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('customer_type')}
                    type="radio"
                    value="b2c"
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">B2C (Privatkunde)</span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('customer_type')}
                    type="radio"
                    value="b2g"
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">B2G (Öffentlicher Sektor)</span>
                </label>
              </div>
            </div>

            {/* Company or Person */}
            {customerType === 'b2b' || customerType === 'b2g' ? (
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenname *
                </label>
                <input
                  {...register('company_name')}
                  type="text"
                  id="company_name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Musterfirma GmbH"
                />
                {errors.company_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Vorname *
                  </label>
                  <input
                    {...register('first_name')}
                    type="text"
                    id="first_name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nachname *
                  </label>
                  <input
                    {...register('last_name')}
                    type="text"
                    id="last_name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Mustermann"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Kontaktdaten</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="kunde@beispiel.de"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  id="phone"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="+49 123 456789"
                />
              </div>

              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
                  Mobil
                </label>
                <input
                  {...register('mobile')}
                  type="tel"
                  id="mobile"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="+49 170 1234567"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Rechnungsadresse</h2>

            <div>
              <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-2">
                Straße und Hausnummer *
              </label>
              <input
                {...register('address_line1')}
                type="text"
                id="address_line1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Musterstraße 123"
              />
              {errors.address_line1 && (
                <p className="mt-1 text-sm text-red-600">{errors.address_line1.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-2">
                Adresszusatz
              </label>
              <input
                {...register('address_line2')}
                type="text"
                id="address_line2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Gebäude A, 3. OG"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-2">
                  PLZ *
                </label>
                <input
                  {...register('zip_code')}
                  type="text"
                  id="zip_code"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="12345"
                />
                {errors.zip_code && (
                  <p className="mt-1 text-sm text-red-600">{errors.zip_code.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  Stadt *
                </label>
                <input
                  {...register('city')}
                  type="text"
                  id="city"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Berlin"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Land
              </label>
              <select
                {...register('country')}
                id="country"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
              </select>
            </div>
          </div>

          {/* Tax Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Steuerinformationen</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Steuernummer
                </label>
                <input
                  {...register('tax_id')}
                  type="text"
                  id="tax_id"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="12/345/67890"
                />
              </div>

              <div>
                <label htmlFor="vat_id" className="block text-sm font-medium text-gray-700 mb-2">
                  USt-IdNr.
                </label>
                <input
                  {...register('vat_id')}
                  type="text"
                  id="vat_id"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="DE123456789"
                />
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Zahlungskonditionen</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700 mb-2">
                  Standardrabatt (%)
                </label>
                <input
                  {...register('discount_percentage')}
                  type="number"
                  id="discount_percentage"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Notizen</h2>

            <div>
              <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Interne Notizen (nur für Ihr Team sichtbar)
              </label>
              <textarea
                {...register('internal_notes')}
                id="internal_notes"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Notizen, die nur Ihr Team sehen kann..."
              />
            </div>

            <div>
              <label htmlFor="customer_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Kundennotizen (erscheinen auf Rechnungen)
              </label>
              <textarea
                {...register('customer_notes')}
                id="customer_notes"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Notizen, die auf Rechnungen erscheinen..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => window.location.href = '/customers'}
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
              {isLoading ? 'Speichert...' : 'Kunde speichern'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
