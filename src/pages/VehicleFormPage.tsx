import { useState, useEffect, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

interface VehicleForm {
  license_plate: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number | '';
  vin: string;
  fuel_type: string;
  fuel_capacity_liters: number | '';
  loading_capacity_kg: number | '';
  loading_capacity_m3: number | '';
  emission_class: string;
  registration_date: string;
  next_inspection_date: string;
  insurance_expires: string;
  insurance_company: string;
  insurance_policy_number: string;
  current_mileage_km: number | '';
  last_service_date: string;
  last_service_mileage_km: number | '';
  next_service_due_km: number | '';
  next_service_due_date: string;
  status: string;
  purchase_price: number | '';
  purchase_date: string;
  estimated_monthly_costs: number | '';
  notes: string;
}

export function VehicleFormPage() {
  const { vehicleId } = useParams({ strict: false }) as { vehicleId?: string };
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<VehicleForm>({
    license_plate: '',
    vehicle_type: 'truck',
    make: '',
    model: '',
    year: '',
    vin: '',
    fuel_type: 'diesel',
    fuel_capacity_liters: '',
    loading_capacity_kg: '',
    loading_capacity_m3: '',
    emission_class: '',
    registration_date: '',
    next_inspection_date: '',
    insurance_expires: '',
    insurance_company: '',
    insurance_policy_number: '',
    current_mileage_km: '',
    last_service_date: '',
    last_service_mileage_km: '',
    next_service_due_km: '',
    next_service_due_date: '',
    status: 'active',
    purchase_price: '',
    purchase_date: '',
    estimated_monthly_costs: '',
    notes: '',
  });

  const loadVehicle = useCallback(async () => {
    if (!vehicleId || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          license_plate: data.license_plate || '',
          vehicle_type: data.vehicle_type || 'truck',
          make: data.make || '',
          model: data.model || '',
          year: data.year || '',
          vin: data.vin || '',
          fuel_type: data.fuel_type || 'diesel',
          fuel_capacity_liters: data.fuel_capacity_liters || '',
          loading_capacity_kg: data.loading_capacity_kg || '',
          loading_capacity_m3: data.loading_capacity_m3 || '',
          emission_class: data.emission_class || '',
          registration_date: data.registration_date || '',
          next_inspection_date: data.next_inspection_date || '',
          insurance_expires: data.insurance_expires || '',
          insurance_company: data.insurance_company || '',
          insurance_policy_number: data.insurance_policy_number || '',
          current_mileage_km: data.current_mileage_km || '',
          last_service_date: data.last_service_date || '',
          last_service_mileage_km: data.last_service_mileage_km || '',
          next_service_due_km: data.next_service_due_km || '',
          next_service_due_date: data.next_service_due_date || '',
          status: data.status || 'active',
          purchase_price: data.purchase_price || '',
          purchase_date: data.purchase_date || '',
          estimated_monthly_costs: data.estimated_monthly_costs || '',
          notes: data.notes || '',
        });
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, user]);

  useEffect(() => {
    if (vehicleId) {
      loadVehicle();
    }
  }, [vehicleId, loadVehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      const vehicleData = {
        tenant_id: user.tenant_id,
        license_plate: formData.license_plate,
        vehicle_type: formData.vehicle_type,
        make: formData.make,
        model: formData.model,
        year: formData.year || null,
        vin: formData.vin || null,
        fuel_type: formData.fuel_type || null,
        fuel_capacity_liters: formData.fuel_capacity_liters || null,
        loading_capacity_kg: formData.loading_capacity_kg || null,
        loading_capacity_m3: formData.loading_capacity_m3 || null,
        emission_class: formData.emission_class || null,
        registration_date: formData.registration_date || null,
        next_inspection_date: formData.next_inspection_date || null,
        insurance_expires: formData.insurance_expires || null,
        insurance_company: formData.insurance_company || null,
        insurance_policy_number: formData.insurance_policy_number || null,
        current_mileage_km: formData.current_mileage_km || 0,
        last_service_date: formData.last_service_date || null,
        last_service_mileage_km: formData.last_service_mileage_km || null,
        next_service_due_km: formData.next_service_due_km || null,
        next_service_due_date: formData.next_service_due_date || null,
        status: formData.status,
        purchase_price: formData.purchase_price || null,
        purchase_date: formData.purchase_date || null,
        estimated_monthly_costs: formData.estimated_monthly_costs || null,
        notes: formData.notes || null,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (vehicleId) {
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', vehicleId)
          .eq('tenant_id', user.tenant_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert([vehicleData]);

        if (error) throw error;
      }

      window.location.href = '/vehicles';
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof VehicleForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/vehicles'}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {vehicleId ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Verwalten Sie die Fahrzeugdaten
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grunddaten */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Grunddaten</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kennzeichen *
                </label>
                <input
                  type="text"
                  required
                  value={formData.license_plate}
                  onChange={(e) => handleChange('license_plate', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="B-AB 1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fahrzeugtyp *
                </label>
                <select
                  required
                  value={formData.vehicle_type}
                  onChange={(e) => handleChange('vehicle_type', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="truck">LKW</option>
                  <option value="van">Transporter</option>
                  <option value="car">PKW</option>
                  <option value="trailer">Anhänger</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Marke *
                </label>
                <input
                  type="text"
                  required
                  value={formData.make}
                  onChange={(e) => handleChange('make', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Mercedes-Benz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Modell *
                </label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Actros"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Baujahr
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleChange('year', e.target.value ? parseInt(e.target.value) : '')}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="2020"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  FIN/VIN
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => handleChange('vin', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="WDB9634321L123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kraftstoff
                </label>
                <select
                  value={formData.fuel_type}
                  onChange={(e) => handleChange('fuel_type', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="diesel">Diesel</option>
                  <option value="petrol">Benzin</option>
                  <option value="electric">Elektro</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="cng">Erdgas (CNG)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="active">Aktiv</option>
                  <option value="maintenance">In Wartung</option>
                  <option value="inactive">Inaktiv</option>
                  <option value="sold">Verkauft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kilometerstand (km)
                </label>
                <input
                  type="number"
                  value={formData.current_mileage_km}
                  onChange={(e) => handleChange('current_mileage_km', e.target.value ? parseInt(e.target.value) : '')}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="150000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nächster TÜV
                </label>
                <input
                  type="date"
                  value={formData.next_inspection_date}
                  onChange={(e) => handleChange('next_inspection_date', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notizen */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Notizen</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Zusätzliche Informationen zum Fahrzeug..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => window.location.href = '/vehicles'}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
