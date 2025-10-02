import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Building, CreditCard, Bell, Shield, Users, Upload, Landmark } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

const companySchema = z.object({
  company_name: z.string().min(1, 'Firmenname ist erforderlich'),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  zip_code: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('DE'),
  phone: z.string().optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  website: z.string().optional(),
  tax_id: z.string().optional(),
  vat_id: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_holder: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  bank_notes: z.string().optional(),
});

type CompanyForm = z.infer<typeof companySchema>;

export function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'company' | 'bank' | 'subscription' | 'notifications' | 'security' | 'users'>('company');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { user, tenant, subscription } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    if (tenant) {
      Object.keys(tenant).forEach((key) => {
        setValue(key as any, (tenant as any)[key]);
      });
      if (tenant.logo_url) {
        setLogoUrl(tenant.logo_url);
      }
    }
  }, [tenant, setValue]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingLogo(true);
      setError('');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.tenant_id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: publicUrl })
        .eq('id', user.tenant_id);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      setSuccess('Logo erfolgreich hochgeladen');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Fehler beim Hochladen des Logos');
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = async (data: CompanyForm) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', user.tenant_id);

      if (updateError) throw updateError;

      setSuccess('Einstellungen erfolgreich gespeichert');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'company', name: 'Firmendaten', icon: Building },
    { id: 'bank', name: 'Bankverbindung', icon: Landmark },
    { id: 'subscription', name: 'Abonnement', icon: CreditCard },
    { id: 'users', name: 'Benutzer', icon: Users },
    { id: 'notifications', name: 'Benachrichtigungen', icon: Bell },
    { id: 'security', name: 'Sicherheit', icon: Shield },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="mt-1 text-sm text-gray-500">
            Verwalten Sie Ihre Konto- und Firmeneinstellungen
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="md:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                      activeTab === tab.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'company' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6 space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Firmendaten</h2>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Firmenlogo
                    </label>
                    {logoUrl && (
                      <div className="mb-4">
                        <img src={logoUrl} alt="Firmenlogo" className="h-20 object-contain" />
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Upload className="h-5 w-5 mr-2" />
                        {uploadingLogo ? 'Lädt hoch...' : 'Logo hochladen'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                      <span className="text-sm text-gray-500">PNG, JPG bis 2MB</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Firmenname *
                    </label>
                    <input
                      {...register('company_name')}
                      type="text"
                      id="company_name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {errors.company_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-2">
                      Straße und Hausnummer
                    </label>
                    <input
                      {...register('address_line1')}
                      type="text"
                      id="address_line1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
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
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-2">
                        PLZ
                      </label>
                      <input
                        {...register('zip_code')}
                        type="text"
                        id="zip_code"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                        Stadt
                      </label>
                      <input
                        {...register('city')}
                        type="text"
                        id="city"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        id="phone"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        E-Mail
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        id="email"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      {...register('website')}
                      type="url"
                      id="website"
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

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
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Save className="h-5 w-5 mr-2" />
                      {isLoading ? 'Speichert...' : 'Änderungen speichern'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'bank' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-6 w-6 text-gray-400" />
                    <h2 className="text-lg font-medium text-gray-900">Bankverbindung</h2>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Diese Daten werden auf Ihren Rechnungen angezeigt und für Zahlungseingänge verwendet.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="bank_account_holder" className="block text-sm font-medium text-gray-700 mb-2">
                      Kontoinhaber
                    </label>
                    <input
                      {...register('bank_account_holder')}
                      type="text"
                      id="bank_account_holder"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Bankname
                    </label>
                    <input
                      {...register('bank_name')}
                      type="text"
                      id="bank_name"
                      placeholder="z.B. Deutsche Bank"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-2">
                        IBAN
                      </label>
                      <input
                        {...register('iban')}
                        type="text"
                        id="iban"
                        placeholder="DE89 3704 0044 0532 0130 00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                      />
                    </div>

                    <div>
                      <label htmlFor="bic" className="block text-sm font-medium text-gray-700 mb-2">
                        BIC/SWIFT
                      </label>
                      <input
                        {...register('bic')}
                        type="text"
                        id="bic"
                        placeholder="COBADEFFXXX"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bank_notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Notizen
                    </label>
                    <textarea
                      {...register('bank_notes')}
                      id="bank_notes"
                      rows={3}
                      placeholder="Optionale Hinweise zur Bankverbindung..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Save className="h-5 w-5 mr-2" />
                      {isLoading ? 'Speichert...' : 'Änderungen speichern'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'subscription' && (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Abonnement</h2>

                <div className="border-l-4 border-indigo-500 bg-indigo-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CreditCard className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-indigo-800">
                        Aktueller Plan: {subscription?.plan_type === 'rechnung.best' ? 'rechnung.best' : subscription?.plan_type}
                      </h3>
                      <div className="mt-2 text-sm text-indigo-700">
                        <p>Status: {subscription?.status === 'trialing' ? 'Testzeitraum' : subscription?.status}</p>
                        {subscription?.trial_ends_at && subscription.status === 'trialing' && (
                          <p className="mt-1">
                            Testzeitraum endet: {new Date(subscription.trial_ends_at).toLocaleDateString('de-DE')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Funktionen Ihres Plans:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      Unbegrenzte Rechnungen
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      Unbegrenzte Kunden
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      Fuhrpark-Management
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      Lieferschein-Verwaltung
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      GoBD-konformes Kassenbuch
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      XRechnung & ZUGFeRD Export
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      DATEV Integration
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      Premium Support
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-4">
                    Nach Ablauf des Testzeitraums wird Ihr Abonnement automatisch aktiviert.
                  </p>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Zahlungsdetails verwalten
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Benutzerverwaltung</h2>
                  <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Benutzer einladen
                  </button>
                </div>

                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                        <p className="text-sm text-gray-500">Administrator (Sie)</p>
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Aktiv
                      </span>
                    </div>
                  </div>
                  <div className="p-4 text-center text-sm text-gray-500">
                    Weitere Benutzer können hinzugefügt werden, sobald Ihr Testzeitraum abgelaufen ist.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Benachrichtigungen</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">E-Mail-Benachrichtigungen</p>
                      <p className="text-sm text-gray-500">Erhalten Sie Updates per E-Mail</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Rechnungserinnerungen</p>
                      <p className="text-sm text-gray-500">Benachrichtigung bei fälligen Rechnungen</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Zahlungseingänge</p>
                      <p className="text-sm text-gray-500">Benachrichtigung bei Zahlungseingang</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Sicherheit</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Passwort ändern</h3>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Passwort ändern
                    </button>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Zwei-Faktor-Authentifizierung</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Erhöhen Sie die Sicherheit Ihres Kontos mit 2FA
                    </p>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      2FA aktivieren
                    </button>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Aktive Sitzungen</h3>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Aktuelle Sitzung</p>
                          <p className="text-sm text-gray-500">Angemeldet am {new Date().toLocaleDateString('de-DE')}</p>
                        </div>
                        <span className="text-green-600 text-sm">Aktiv</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
