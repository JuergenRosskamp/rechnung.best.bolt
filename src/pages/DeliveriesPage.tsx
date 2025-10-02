import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { DeliveryPosition, Customer, Article, DeliveryLocation } from '../types';
import { getErrorMessage } from '../lib/errors';
import { Truck, Plus, CreditCard as Edit2, Trash2, Search, FileText, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type: string;
  make: string;
  model: string;
  status: string;
}

interface PriceCalculation {
  unit_price: number;
  total_price: number;
  source: string;
  details: {
    price: number;
    source: string;
    min_quantity?: number;
  };
}

export function DeliveriesPage() {
  const { user } = useAuthStore();
  const { toasts, hideToast, success, info, warning } = useToast();
  const [positions, setPositions] = useState<DeliveryPosition[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [billingFilter, setBillingFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<DeliveryPosition | null>(null);

  const [calculatedPrice, setCalculatedPrice] = useState<PriceCalculation | null>(null);
  const [manualPriceOverride, setManualPriceOverride] = useState(false);
  const [showSavePriceDialog, setShowSavePriceDialog] = useState(false);
  const [savePriceType, setSavePriceType] = useState<'quantity' | 'customer' | 'location'>('quantity');
  const [savePriceMinQuantity, setSavePriceMinQuantity] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    article_id: '',
    delivery_location_id: '',
    delivery_quantity: '',
    unit_price: '',
    delivery_status: 'DELIVERED' as const,
    vehicle_id: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      setError(null);

      const [positionsRes, customersRes, articlesRes, locationsRes, vehiclesRes] = await Promise.all([
        supabase
          .from('delivery_positions')
          .select('*')
          .eq('tenant_id', user.tenant_id)
          .is('deleted_at', null)
          .order('delivery_timestamp', { ascending: false }),
        supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', user.tenant_id)
          .is('deleted_at', null)
          .order('company_name'),
        supabase
          .from('articles')
          .select('*')
          .eq('tenant_id', user.tenant_id)
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('description'),
        supabase
          .from('delivery_locations')
          .select('*')
          .eq('tenant_id', user.tenant_id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('vehicles')
          .select('id, license_plate, vehicle_type, make, model, status')
          .eq('tenant_id', user.tenant_id)
          .eq('status', 'active')
          .order('license_plate'),
      ]);

      if (positionsRes.error) throw positionsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (articlesRes.error) throw articlesRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;

      setPositions(positionsRes.data || []);
      setCustomers(customersRes.data || []);
      setArticles(articlesRes.data || []);
      setLocations(locationsRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculatePrice = useCallback(async () => {
    if (!user?.tenant_id || !formData.article_id || !formData.delivery_quantity) return;

    const quantity = parseFloat(formData.delivery_quantity);
    if (isNaN(quantity) || quantity <= 0) return;

    try {
      const { data, error } = await supabase.rpc('calculate_best_price', {
        p_tenant_id: user.tenant_id,
        p_article_id: formData.article_id,
        p_quantity: quantity,
        p_customer_id: formData.customer_id || null,
        p_delivery_location_id: formData.delivery_location_id || null,
      });

      if (error) throw error;

      if (data) {
        setCalculatedPrice(data);
        setFormData(prev => ({ ...prev, unit_price: data.unit_price.toFixed(2) }));
        setManualPriceOverride(false);

        const sourceMessages = {
          'location_price': `Lieferort-Preis angewendet: ${data.unit_price.toFixed(2)} €`,
          'customer_price': `Kunden-Preis angewendet: ${data.unit_price.toFixed(2)} €`,
          'quantity_price': `Mengenstaffel-Preis angewendet: ${data.unit_price.toFixed(2)} € (ab ${data.details.min_quantity} ${articles.find(a => a.id === formData.article_id)?.unit || 'Einheiten'})`,
          'base_price': `Basispreis verwendet: ${data.unit_price.toFixed(2)} €`,
        };

        info(sourceMessages[data.source as keyof typeof sourceMessages] || 'Preis berechnet');
      }
    } catch (err) {
      warning('Preisberechnung fehlgeschlagen: ' + getErrorMessage(err));
    }
  }, [user?.tenant_id, formData.article_id, formData.delivery_quantity, formData.customer_id, formData.delivery_location_id, articles, info, warning]);

  useEffect(() => {
    if (formData.article_id && formData.delivery_quantity && !manualPriceOverride) {
      const timer = setTimeout(() => {
        calculatePrice();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.article_id, formData.delivery_quantity, formData.customer_id, formData.delivery_location_id, calculatePrice, manualPriceOverride]);

  const handlePriceChange = (value: string) => {
    setFormData(prev => ({ ...prev, unit_price: value }));
    setManualPriceOverride(true);

    if (calculatedPrice && parseFloat(value) !== calculatedPrice.unit_price) {
      warning('Manueller Preis eingegeben. Möchten Sie diesen Preis speichern?');
    }
  };

  const handleSaveCustomPrice = async () => {
    if (!user?.tenant_id || !formData.article_id || !formData.unit_price) return;

    const unitPrice = parseFloat(formData.unit_price);
    const minQuantity = parseFloat(savePriceMinQuantity) || 0;

    try {
      if (savePriceType === 'location' && formData.delivery_location_id) {
        const { error } = await supabase.from('article_location_prices').insert({
          tenant_id: user.tenant_id,
          article_id: formData.article_id,
          delivery_location_id: formData.delivery_location_id,
          min_quantity: minQuantity,
          unit_price: unitPrice,
          is_active: true,
        });
        if (error) throw error;
        success('Lieferort-Preis gespeichert');
      } else if (savePriceType === 'customer' && formData.customer_id) {
        const { error } = await supabase.from('article_customer_prices').insert({
          tenant_id: user.tenant_id,
          article_id: formData.article_id,
          customer_id: formData.customer_id,
          min_quantity: minQuantity,
          unit_price: unitPrice,
          is_active: true,
        });
        if (error) throw error;
        success('Kunden-Preis gespeichert');
      } else if (savePriceType === 'quantity') {
        const { error } = await supabase.from('article_quantity_prices').insert({
          tenant_id: user.tenant_id,
          article_id: formData.article_id,
          min_quantity: minQuantity,
          unit_price: unitPrice,
          is_active: true,
        });
        if (error) throw error;
        success('Mengenstaffel-Preis gespeichert');
      }

      setShowSavePriceDialog(false);
      setSavePriceMinQuantity('');
    } catch (err) {
      warning('Fehler beim Speichern: ' + getErrorMessage(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenant_id) return;

    try {
      const article = articles.find(a => a.id === formData.article_id);
      const customer = customers.find(c => c.id === formData.customer_id);

      if (!article || !customer) {
        throw new Error('Artikel oder Kunde nicht gefunden');
      }

      const quantity = parseFloat(formData.delivery_quantity);
      const unitPrice = parseFloat(formData.unit_price);
      const totalPrice = unitPrice * quantity;

      let deliveryNoteNumber = '';
      if (!editingPosition) {
        const { data: nextNumber } = await supabase.rpc('generate_next_delivery_note_number', {
          p_tenant_id: user.tenant_id
        });
        deliveryNoteNumber = nextNumber || `LS-${Date.now()}`;
      }

      const location = formData.delivery_location_id
        ? locations.find(l => l.id === formData.delivery_location_id)
        : null;

      const deliveryAddress = location
        ? `${location.name}, ${location.address_line1}, ${location.zip_code} ${location.city}`
        : '';

      const positionData = {
        tenant_id: user.tenant_id,
        customer_id: formData.customer_id,
        article_id: formData.article_id,
        delivery_location_id: formData.delivery_location_id || null,
        delivery_note_number: editingPosition?.delivery_note_number || deliveryNoteNumber,
        delivery_quantity: quantity,
        delivery_status: formData.delivery_status,
        delivery_address: deliveryAddress,
        unit_price: unitPrice,
        discount_percentage: 0,
        discounted_price: unitPrice,
        total_price: totalPrice,
        unit: article.unit,
        description: article.description,
        vehicle_id: formData.vehicle_id || null,
        notes: formData.notes || null,
        customer_snapshot: {
          company_name: customer.company_name,
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone,
        },
        article_snapshot: {
          article_number: article.article_number,
          description: article.description,
          unit: article.unit,
          base_price: unitPrice,
        },
      };

      if (editingPosition) {
        const { error: updateError } = await supabase
          .from('delivery_positions')
          .update(positionData)
          .eq('id', editingPosition.id);

        if (updateError) throw updateError;
        success('Lieferung aktualisiert');
      } else {
        const { error: insertError } = await supabase
          .from('delivery_positions')
          .insert(positionData);

        if (insertError) throw insertError;
        success('Lieferung erstellt');
      }

      setShowForm(false);
      setEditingPosition(null);
      setFormData({
        customer_id: '',
        article_id: '',
        delivery_location_id: '',
        delivery_quantity: '',
        unit_price: '',
        delivery_status: 'DELIVERED',
        vehicle_id: '',
        notes: '',
      });
      setCalculatedPrice(null);
      setManualPriceOverride(false);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Lieferung wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('delivery_positions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      success('Lieferung gelöscht');
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Unbekannt';
    return customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  };

  const getArticleDescription = (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    return article?.description || 'Unbekannt';
  };

  const getVehicleName = (vehicleId: string | undefined) => {
    if (!vehicleId) return '-';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.license_plate} (${vehicle.make} ${vehicle.model})` : '-';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_TRANSIT: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      PENDING: 'Ausstehend',
      IN_TRANSIT: 'Unterwegs',
      DELIVERED: 'Geliefert',
      CANCELLED: 'Storniert',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const filteredPositions = positions.filter(pos => {
    const matchesSearch =
      pos.delivery_note_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(pos.customer_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getArticleDescription(pos.article_id).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || pos.delivery_status === statusFilter;
    const matchesBilling =
      billingFilter === 'all' ||
      (billingFilter === 'billed' && pos.customer_billing_done) ||
      (billingFilter === 'unbilled' && !pos.customer_billing_done);

    return matchesSearch && matchesStatus && matchesBilling;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Lieferungen...</p>
          </div>
        </div>
      </Layout>
    );
  }

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

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lieferungen</h1>
            <p className="text-gray-600 mt-1">Verwalten Sie Ihre Lieferscheine und Lieferpositionen</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Neue Lieferung
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Suche nach Lieferschein-Nr., Kunde, Artikel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Alle Status</option>
              <option value="PENDING">Ausstehend</option>
              <option value="IN_TRANSIT">Unterwegs</option>
              <option value="DELIVERED">Geliefert</option>
              <option value="CANCELLED">Storniert</option>
            </select>
            <select
              value={billingFilter}
              onChange={(e) => setBillingFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Alle Abrechnungsstatus</option>
              <option value="unbilled">Nicht abgerechnet</option>
              <option value="billed">Abgerechnet</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LS-Nr.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kunde</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artikel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fahrzeug</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Menge</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Einzelpreis</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gesamt</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Abgerechnet</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                      Keine Lieferungen gefunden
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((position) => (
                    <tr key={position.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {position.delivery_note_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(position.delivery_timestamp), 'dd.MM.yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getCustomerName(position.customer_id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getArticleDescription(position.article_id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {getVehicleName(position.vehicle_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {position.delivery_quantity.toFixed(3)} {position.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {position.unit_price.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {position.total_price.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(position.delivery_status)}`}>
                          {getStatusLabel(position.delivery_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {position.customer_billing_done ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <FileText className="w-4 h-4" />
                            Ja
                          </span>
                        ) : (
                          <span className="text-gray-400">Nein</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {!position.customer_billing_done && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPosition(position);
                                  setFormData({
                                    customer_id: position.customer_id,
                                    article_id: position.article_id,
                                    delivery_location_id: position.delivery_location_id || '',
                                    delivery_quantity: position.delivery_quantity.toString(),
                                    unit_price: position.unit_price.toString(),
                                    delivery_status: position.delivery_status,
                                    vehicle_id: position.vehicle_id || '',
                                    notes: position.notes || '',
                                  });
                                  setShowForm(true);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(position.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingPosition ? 'Lieferung bearbeiten' : 'Neue Lieferung'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kunde *
                      </label>
                      <select
                        required
                        value={formData.customer_id}
                        onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Kunde wählen...</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Artikel *
                      </label>
                      <select
                        required
                        value={formData.article_id}
                        onChange={(e) => setFormData({ ...formData, article_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Artikel wählen...</option>
                        {articles.map(article => (
                          <option key={article.id} value={article.id}>
                            {article.description} ({article.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lieferort (optional)
                      </label>
                      <select
                        value={formData.delivery_location_id}
                        onChange={(e) => setFormData({ ...formData, delivery_location_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Kein Lieferort</option>
                        {locations
                          .filter(loc => !formData.customer_id || loc.customer_id === formData.customer_id)
                          .map(location => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Menge *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={formData.delivery_quantity}
                        onChange={(e) => setFormData({ ...formData, delivery_quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Einzelpreis (€) *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.unit_price}
                          onChange={(e) => handlePriceChange(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {manualPriceOverride && calculatedPrice && parseFloat(formData.unit_price) !== calculatedPrice.unit_price && (
                          <button
                            type="button"
                            onClick={() => setShowSavePriceDialog(true)}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            title="Preis speichern"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {calculatedPrice && (
                        <p className="text-xs text-gray-500 mt-1">
                          {calculatedPrice.details.source}
                          {formData.delivery_quantity && ` | Gesamt: ${(parseFloat(formData.unit_price) * parseFloat(formData.delivery_quantity)).toFixed(2)} €`}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fahrzeug
                      </label>
                      <select
                        value={formData.vehicle_id}
                        onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Kein Fahrzeug</option>
                        {vehicles.map(vehicle => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.license_plate} - {vehicle.make} {vehicle.model}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.delivery_status}
                        onChange={(e) => setFormData({ ...formData, delivery_status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="PENDING">Ausstehend</option>
                        <option value="IN_TRANSIT">Unterwegs</option>
                        <option value="DELIVERED">Geliefert</option>
                        <option value="CANCELLED">Storniert</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notizen
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingPosition(null);
                        setFormData({
                          customer_id: '',
                          article_id: '',
                          delivery_location_id: '',
                          delivery_quantity: '',
                          unit_price: '',
                          delivery_status: 'DELIVERED',
                          vehicle_id: '',
                          notes: '',
                        });
                        setCalculatedPrice(null);
                        setManualPriceOverride(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editingPosition ? 'Speichern' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showSavePriceDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Preis speichern</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preistyp
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="quantity"
                        checked={savePriceType === 'quantity'}
                        onChange={(e) => setSavePriceType(e.target.value as any)}
                        className="mr-2"
                      />
                      Mengenstaffel (für alle Kunden)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="customer"
                        checked={savePriceType === 'customer'}
                        onChange={(e) => setSavePriceType(e.target.value as any)}
                        disabled={!formData.customer_id}
                        className="mr-2"
                      />
                      Kundenspezifisch
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="location"
                        checked={savePriceType === 'location'}
                        onChange={(e) => setSavePriceType(e.target.value as any)}
                        disabled={!formData.delivery_location_id}
                        className="mr-2"
                      />
                      Lieferortspezifisch
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ab Menge (optional)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={savePriceMinQuantity}
                    onChange={(e) => setSavePriceMinQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leer lassen für Preis ab 0 Einheiten
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Preis:</strong> {formData.unit_price} € pro {articles.find(a => a.id === formData.article_id)?.unit || 'Einheit'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSavePriceDialog(false);
                    setSavePriceMinQuantity('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveCustomPrice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Preis speichern
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
