import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import { Plus, Trash2, X } from 'lucide-react';

interface ArticlePriceManagementProps {
  articleId: string;
  articleUnit: string;
}

interface QuantityPrice {
  id: string;
  min_quantity: number;
  unit_price: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

interface CustomerPrice {
  id: string;
  customer_id: string;
  customer_name: string;
  min_quantity: number;
  unit_price: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
}

interface LocationPrice {
  id: string;
  delivery_location_id: string;
  location_name: string;
  min_quantity: number;
  unit_price: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
}

export function ArticlePriceManagement({ articleId, articleUnit }: ArticlePriceManagementProps) {
  const { user } = useAuthStore();
  const [quantityPrices, setQuantityPrices] = useState<QuantityPrice[]>([]);
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice[]>([]);
  const [locationPrices, setLocationPrices] = useState<LocationPrice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [priceType, setPriceType] = useState<'quantity' | 'customer' | 'location'>('quantity');
  const [formData, setFormData] = useState({
    customer_id: '',
    location_id: '',
    min_quantity: '',
    unit_price: '',
    valid_from: '',
    valid_until: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [articleId]);

  const loadData = async () => {
    if (!user?.tenant_id || !articleId) return;

    try {
      setLoading(true);
      const [qtyRes, custRes, locRes, customersRes, locationsRes] = await Promise.all([
        supabase
          .from('article_quantity_prices')
          .select('*')
          .eq('tenant_id', user.tenant_id)
          .eq('article_id', articleId)
          .order('min_quantity'),
        supabase
          .from('article_customer_prices')
          .select(`
            *,
            customers:customer_id (id, company_name, first_name, last_name)
          `)
          .eq('tenant_id', user.tenant_id)
          .eq('article_id', articleId)
          .order('min_quantity'),
        supabase
          .from('article_location_prices')
          .select(`
            *,
            delivery_locations:delivery_location_id (id, name)
          `)
          .eq('tenant_id', user.tenant_id)
          .eq('article_id', articleId)
          .order('min_quantity'),
        supabase
          .from('customers')
          .select('id, company_name, first_name, last_name')
          .eq('tenant_id', user.tenant_id)
          .is('deleted_at', null)
          .order('company_name'),
        supabase
          .from('delivery_locations')
          .select('id, name, customer_id')
          .eq('tenant_id', user.tenant_id)
          .eq('is_active', true)
          .order('name'),
      ]);

      if (qtyRes.error) throw qtyRes.error;
      if (custRes.error) throw custRes.error;
      if (locRes.error) throw locRes.error;
      if (customersRes.error) throw customersRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setQuantityPrices(qtyRes.data || []);

      const customerPricesData = (custRes.data || []).map((cp: any) => ({
        ...cp,
        customer_name: cp.customers?.company_name || `${cp.customers?.first_name} ${cp.customers?.last_name}`,
      }));
      setCustomerPrices(customerPricesData);

      const locationPricesData = (locRes.data || []).map((lp: any) => ({
        ...lp,
        location_name: lp.delivery_locations?.name || 'Unbekannt',
      }));
      setLocationPrices(locationPricesData);

      setCustomers(customersRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async () => {
    if (!user?.tenant_id) return;

    const minQty = parseFloat(formData.min_quantity) || 0;
    const unitPrice = parseFloat(formData.unit_price);

    if (isNaN(unitPrice) || unitPrice < 0) {
      setError('Ungültiger Preis');
      return;
    }

    try {
      if (priceType === 'quantity') {
        const { error } = await supabase.from('article_quantity_prices').insert({
          tenant_id: user.tenant_id,
          article_id: articleId,
          min_quantity: minQty,
          unit_price: unitPrice,
          is_active: true,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
        });
        if (error) throw error;
      } else if (priceType === 'customer' && formData.customer_id) {
        const { error } = await supabase.from('article_customer_prices').insert({
          tenant_id: user.tenant_id,
          article_id: articleId,
          customer_id: formData.customer_id,
          min_quantity: minQty,
          unit_price: unitPrice,
          is_active: true,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
          notes: formData.notes || null,
        });
        if (error) throw error;
      } else if (priceType === 'location' && formData.location_id) {
        const { error } = await supabase.from('article_location_prices').insert({
          tenant_id: user.tenant_id,
          article_id: articleId,
          delivery_location_id: formData.location_id,
          min_quantity: minQty,
          unit_price: unitPrice,
          is_active: true,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
          notes: formData.notes || null,
        });
        if (error) throw error;
      }

      setShowAddDialog(false);
      setFormData({
        customer_id: '',
        location_id: '',
        min_quantity: '',
        unit_price: '',
        valid_from: '',
        valid_until: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (type: 'quantity' | 'customer' | 'location', id: string) => {
    if (!confirm('Preis wirklich löschen?')) return;

    try {
      const table = type === 'quantity' ? 'article_quantity_prices' :
                    type === 'customer' ? 'article_customer_prices' :
                    'article_location_prices';

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) {
    return <div className="text-center py-4">Lade Preise...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-secondary-50">Preisverwaltung</h3>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Preis hinzufügen
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-secondary-50 mb-2">Mengenstaffeln (allgemein)</h4>
          <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-4">
            {quantityPrices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-secondary-500">Keine Mengenstaffeln definiert</p>
            ) : (
              <div className="space-y-2">
                {quantityPrices.map(price => (
                  <div key={price.id} className="flex justify-between items-center bg-white dark:bg-secondary-800 p-3 rounded border">
                    <div>
                      <span className="font-medium">Ab {price.min_quantity.toFixed(3)} {articleUnit}</span>
                      <span className="mx-2">→</span>
                      <span className="text-blue-600 font-semibold">{price.unit_price.toFixed(2)} €</span>
                      {!price.is_active && <span className="ml-2 text-red-600 text-xs">(Inaktiv)</span>}
                    </div>
                    <button
                      onClick={() => handleDelete('quantity', price.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-secondary-50 mb-2">Kundenspezifische Preise</h4>
          <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-4">
            {customerPrices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-secondary-500">Keine kundenspezifischen Preise definiert</p>
            ) : (
              <div className="space-y-2">
                {customerPrices.map(price => (
                  <div key={price.id} className="flex justify-between items-center bg-white dark:bg-secondary-800 p-3 rounded border">
                    <div>
                      <div className="font-medium">{price.customer_name}</div>
                      <div className="text-sm text-gray-600 dark:text-secondary-400">
                        Ab {price.min_quantity.toFixed(3)} {articleUnit} →
                        <span className="text-blue-600 font-semibold ml-1">{price.unit_price.toFixed(2)} €</span>
                      </div>
                      {price.notes && <div className="text-xs text-gray-500 dark:text-secondary-500 mt-1">{price.notes}</div>}
                    </div>
                    <button
                      onClick={() => handleDelete('customer', price.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-secondary-50 mb-2">Lieferortspezifische Preise</h4>
          <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-4">
            {locationPrices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-secondary-500">Keine lieferortspezifischen Preise definiert</p>
            ) : (
              <div className="space-y-2">
                {locationPrices.map(price => (
                  <div key={price.id} className="flex justify-between items-center bg-white dark:bg-secondary-800 p-3 rounded border">
                    <div>
                      <div className="font-medium">{price.location_name}</div>
                      <div className="text-sm text-gray-600 dark:text-secondary-400">
                        Ab {price.min_quantity.toFixed(3)} {articleUnit} →
                        <span className="text-blue-600 font-semibold ml-1">{price.unit_price.toFixed(2)} €</span>
                      </div>
                      {price.notes && <div className="text-xs text-gray-500 dark:text-secondary-500 mt-1">{price.notes}</div>}
                    </div>
                    <button
                      onClick={() => handleDelete('location', price.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-secondary-50">Preis hinzufügen</h3>
              <button onClick={() => setShowAddDialog(false)} className="text-gray-400 dark:text-secondary-600 hover:text-gray-600 dark:text-secondary-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">Preistyp</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="quantity"
                      checked={priceType === 'quantity'}
                      onChange={(e) => setPriceType(e.target.value as any)}
                      className="mr-2"
                    />
                    Mengenstaffel (allgemein)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="customer"
                      checked={priceType === 'customer'}
                      onChange={(e) => setPriceType(e.target.value as any)}
                      className="mr-2"
                    />
                    Kundenspezifisch
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="location"
                      checked={priceType === 'location'}
                      onChange={(e) => setPriceType(e.target.value as any)}
                      className="mr-2"
                    />
                    Lieferortspezifisch
                  </label>
                </div>
              </div>

              {priceType === 'customer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">Kunde *</label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Kunde wählen...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {priceType === 'location' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">Lieferort *</label>
                  <select
                    required
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Lieferort wählen...</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                  Ab Menge ({articleUnit})
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">Preis (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {priceType !== 'quantity' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">Notizen</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">Gültig von</label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">Gültig bis</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddPrice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
