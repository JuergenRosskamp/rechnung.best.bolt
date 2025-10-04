import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Truck, AlertCircle, Wrench, Calendar } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  status: string;
  current_mileage_km: number;
  next_inspection_date: string;
  next_service_due_date: string;
  assigned_driver_id: string;
  fuel_type: string;
}

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { user } = useAuthStore();

  const loadVehicles = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('vehicles')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const getVehicleTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      truck: 'LKW',
      van: 'Transporter',
      car: 'PKW',
      trailer: 'Anhänger',
      other: 'Sonstiges',
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-800', label: 'Aktiv' },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', label: 'In Wartung' },
      inactive: { color: 'bg-gray-100 dark:bg-secondary-700 text-gray-800 dark:text-secondary-100', label: 'Inaktiv' },
      sold: { color: 'bg-red-100 text-red-800', label: 'Verkauft' },
    };

    const config = statusConfig[status] || statusConfig.active;

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const isServiceDue = (vehicle: Vehicle) => {
    if (!vehicle.next_service_due_date) return false;
    const dueDate = new Date(vehicle.next_service_due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 30;
  };

  const isInspectionDue = (vehicle: Vehicle) => {
    if (!vehicle.next_inspection_date) return false;
    const dueDate = new Date(vehicle.next_inspection_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 60;
  };

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    serviceDue: vehicles.filter(v => isServiceDue(v)).length,
    inspectionDue: vehicles.filter(v => isInspectionDue(v)).length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-secondary-50">Fuhrpark</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-secondary-500">
              Verwalten Sie Ihre Fahrzeuge und Wartungen
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/vehicles/new'}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Neues Fahrzeug
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-secondary-500">Gesamt</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-secondary-50">{stats.total}</p>
              </div>
              <Truck className="h-10 w-10 text-gray-400 dark:text-secondary-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-secondary-500">Aktiv</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Truck className="h-10 w-10 text-green-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-secondary-500">Service fällig</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">{stats.serviceDue}</p>
              </div>
              <Wrench className="h-10 w-10 text-orange-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-secondary-500">TÜV fällig</p>
                <p className="mt-2 text-3xl font-bold text-red-600">{stats.inspectionDue}</p>
              </div>
              <Calendar className="h-10 w-10 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-secondary-600" />
              <input
                type="text"
                placeholder="Suche nach Kennzeichen, Marke oder Modell..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="maintenance">In Wartung</option>
              <option value="inactive">Inaktiv</option>
              <option value="sold">Verkauft</option>
            </select>
          </div>
        </div>

        {/* Vehicle list */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-500 dark:text-secondary-500">Lade Fahrzeuge...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="mx-auto h-12 w-12 text-gray-400 dark:text-secondary-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-secondary-50">Keine Fahrzeuge gefunden</h3>
              <p className="mt-2 text-gray-500 dark:text-secondary-500">
                {searchTerm ? 'Versuchen Sie eine andere Suche.' : 'Fügen Sie Ihr erstes Fahrzeug hinzu.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => window.location.href = '/vehicles/new'}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Erstes Fahrzeug hinzufügen
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                <thead className="bg-gray-50 dark:bg-secondary-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Kennzeichen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Fahrzeug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Kilometerstand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Wartung
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50 dark:bg-secondary-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Truck className="h-5 w-5 text-gray-400 dark:text-secondary-600 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-secondary-50">
                            {vehicle.license_plate}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-secondary-50">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-secondary-500">
                            Baujahr: {vehicle.year}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-secondary-500">
                        {getVehicleTypeLabel(vehicle.vehicle_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-secondary-50">
                        {vehicle.current_mileage_km?.toLocaleString('de-DE')} km
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(vehicle.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isServiceDue(vehicle) && (
                            <span className="inline-flex items-center text-xs text-orange-600">
                              <Wrench className="h-4 w-4 mr-1" />
                              Service
                            </span>
                          )}
                          {isInspectionDue(vehicle) && (
                            <span className="inline-flex items-center text-xs text-red-600">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              TÜV
                            </span>
                          )}
                          {!isServiceDue(vehicle) && !isInspectionDue(vehicle) && (
                            <span className="text-xs text-gray-500 dark:text-secondary-500">OK</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => window.location.href = `/vehicles/${vehicle.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
