import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { DeliveryLocation } from '../types';
import { getErrorMessage } from '../lib/errors';
import { MapPin, Plus, CreditCard as Edit2, Trash2, Phone, Mail, Navigation } from 'lucide-react';

interface Customer {
  id: string;
  display_name: string;
  customer_number: string;
}

export default function DeliveryLocationsPage() {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<DeliveryLocation | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    zip_code: '',
    city: '',
    country: 'DE',
    delivery_instructions: '',
    access_notes: '',
    gps_latitude: '',
    gps_longitude: '',
  });

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('delivery_locations')
        .select(`
          *,
          customers (
            id,
            display_name,
            customer_number
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLocations(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('id, display_name, customer_number')
        .eq('is_active', true)
        .order('display_name');

      if (fetchError) throw fetchError;
      setCustomers(data || []);
    } catch (err) {
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    fetchCustomers();
  }, [fetchLocations, fetchCustomers]);

  const resetForm = useCallback(() => {
    setFormData({
      customer_id: '',
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address_line1: '',
      address_line2: '',
      zip_code: '',
      city: '',
      country: 'DE',
      delivery_instructions: '',
      access_notes: '',
      gps_latitude: '',
      gps_longitude: '',
    });
    setEditingLocation(null);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((location: DeliveryLocation) => {
    setEditingLocation(location);
    setFormData({
      customer_id: location.customer_id,
      name: location.name,
      contact_person: location.contact_person || '',
      phone: location.phone || '',
      email: location.email || '',
      address_line1: location.address_line1,
      address_line2: location.address_line2 || '',
      zip_code: location.zip_code,
      city: location.city,
      country: location.country,
      delivery_instructions: location.delivery_instructions || '',
      access_notes: location.access_notes || '',
      gps_latitude: location.gps_latitude?.toString() || '',
      gps_longitude: location.gps_longitude?.toString() || '',
    });
    setShowForm(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: user } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!user) throw new Error('User not found');

      // Generate location number if creating new
      let locationNumber = editingLocation?.location_number;
      if (!editingLocation) {
        const { data: numberData, error: numberError } = await supabase
          .rpc('generate_next_location_number', {
            p_tenant_id: user.tenant_id,
            p_customer_id: formData.customer_id,
          });

        if (numberError) throw numberError;
        locationNumber = numberData;
      }

      const locationData = {
        tenant_id: user.tenant_id,
        customer_id: formData.customer_id,
        location_number: locationNumber,
        name: formData.name,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || null,
        zip_code: formData.zip_code,
        city: formData.city,
        country: formData.country,
        delivery_instructions: formData.delivery_instructions || null,
        access_notes: formData.access_notes || null,
        gps_latitude: formData.gps_latitude ? parseFloat(formData.gps_latitude) : null,
        gps_longitude: formData.gps_longitude ? parseFloat(formData.gps_longitude) : null,
      };

      if (editingLocation) {
        const { error: updateError } = await supabase
          .from('delivery_locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('delivery_locations')
          .insert(locationData);

        if (insertError) throw insertError;
      }

      await fetchLocations();
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diesen Lieferort wirklich löschen?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('delivery_locations')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchLocations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleActive = async (location: DeliveryLocation) => {
    try {
      const { error: updateError } = await supabase
        .from('delivery_locations')
        .update({ is_active: !location.is_active })
        .eq('id', location.id);

      if (updateError) throw updateError;
      await fetchLocations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openInMaps = (location: DeliveryLocation) => {
    if (location.gps_latitude && location.gps_longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${location.gps_latitude},${location.gps_longitude}`,
        '_blank'
      );
    } else {
      const address = `${location.address_line1}, ${location.zip_code} ${location.city}, ${location.country}`;
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        '_blank'
      );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-secondary-400">Lade Lieferorte...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-secondary-50">Lieferorte</h1>
            <p className="text-gray-600 dark:text-secondary-400 mt-1">Verwalten Sie Ihre Lieferorte und Baustellen</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Neuer Lieferort
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingLocation ? 'Lieferort bearbeiten' : 'Neuer Lieferort'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Customer Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                      Kunde *
                    </label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={!!editingLocation}
                    >
                      <option value="">Kunde auswählen</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.customer_number} - {customer.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                      Bezeichnung *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="z.B. Baustelle Hauptstraße, Lager Nord"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Contact Person */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                        Ansprechpartner
                      </label>
                      <input
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                        E-Mail
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      placeholder="Straße und Hausnummer"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                      Adresszusatz
                    </label>
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                      placeholder="Gebäude, Etage, etc."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                        PLZ *
                      </label>
                      <input
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                        Ort *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                        Land *
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="DE">Deutschland</option>
                        <option value="AT">Österreich</option>
                        <option value="CH">Schweiz</option>
                      </select>
                    </div>
                  </div>

                  {/* GPS Coordinates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                        GPS Breitengrad
                      </label>
                      <input
                        type="text"
                        value={formData.gps_latitude}
                        onChange={(e) => setFormData({ ...formData, gps_latitude: e.target.value })}
                        placeholder="z.B. 52.520008"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                        GPS Längengrad
                      </label>
                      <input
                        type="text"
                        value={formData.gps_longitude}
                        onChange={(e) => setFormData({ ...formData, gps_longitude: e.target.value })}
                        placeholder="z.B. 13.404954"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Delivery Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                      Lieferhinweise
                    </label>
                    <textarea
                      value={formData.delivery_instructions}
                      onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
                      placeholder="Besondere Lieferhinweise..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Access Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                      Zugangshinweise
                    </label>
                    <textarea
                      value={formData.access_notes}
                      onChange={(e) => setFormData({ ...formData, access_notes: e.target.value })}
                      placeholder="Zugangscode, Toreinfahrt, etc."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-700 dark:text-secondary-200 bg-gray-100 dark:bg-secondary-700 rounded-lg hover:bg-gray-200 dark:bg-secondary-600 transition"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      {editingLocation ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Locations List */}
        <div className="grid gap-4">
          {locations.length === 0 ? (
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-8 text-center">
              <MapPin className="w-16 h-16 text-gray-400 dark:text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-secondary-50 mb-2">Keine Lieferorte vorhanden</h3>
              <p className="text-gray-600 dark:text-secondary-400 mb-4">Erstellen Sie Ihren ersten Lieferort</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                Neuer Lieferort
              </button>
            </div>
          ) : (
            locations.map((location) => (
              <div
                key={location.id}
                className={`bg-white rounded-lg shadow p-6 ${!location.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <MapPin className="w-6 h-6 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-secondary-50">{location.name}</h3>
                          <span className="text-sm text-gray-500 dark:text-secondary-500">#{location.location_number}</span>
                          {!location.is_active && (
                            <span className="px-2 py-1 bg-gray-200 dark:bg-secondary-600 text-gray-700 dark:text-secondary-200 text-xs rounded">
                              Inaktiv
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-secondary-400 mb-2">
                          {(location as any).customers?.display_name}
                        </p>
                        <div className="text-gray-700 dark:text-secondary-200">
                          <p>{location.address_line1}</p>
                          {location.address_line2 && <p>{location.address_line2}</p>}
                          <p>
                            {location.zip_code} {location.city}
                          </p>
                        </div>

                        {/* Contact Info */}
                        {(location.contact_person || location.phone || location.email) && (
                          <div className="mt-3 space-y-1">
                            {location.contact_person && (
                              <p className="text-sm text-gray-600 dark:text-secondary-400">
                                <strong>Ansprechpartner:</strong> {location.contact_person}
                              </p>
                            )}
                            {location.phone && (
                              <p className="text-sm text-gray-600 dark:text-secondary-400 flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {location.phone}
                              </p>
                            )}
                            {location.email && (
                              <p className="text-sm text-gray-600 dark:text-secondary-400 flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {location.email}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {location.delivery_instructions && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-secondary-200">
                              <strong>Lieferhinweise:</strong> {location.delivery_instructions}
                            </p>
                          </div>
                        )}
                        {location.access_notes && (
                          <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-secondary-200">
                              <strong>Zugang:</strong> {location.access_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openInMaps(location)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="In Karten öffnen"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Bearbeiten"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleActive(location)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                      title={location.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {location.is_active ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Löschen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
