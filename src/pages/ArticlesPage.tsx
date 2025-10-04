import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Package } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Article {
  id: string;
  article_number: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  vat_rate: number;
  is_active: boolean;
  times_sold: number;
  total_revenue: number;
}

export function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuthStore();

  const loadArticles = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const filteredArticles = articles.filter((article) =>
    article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.article_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: articles.length,
    active: articles.filter(a => a.is_active).length,
    avgPrice: articles.length > 0 ? articles.reduce((sum, a) => sum + a.unit_price, 0) / articles.length : 0,
    totalRevenue: articles.reduce((sum, a) => sum + (a.total_revenue || 0), 0),
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-secondary-50">Artikel & Dienstleistungen</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-secondary-500">
              Verwalten Sie Ihre Produkte und Services
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/articles/new'}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Neuer Artikel
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-secondary-500">Gesamt</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-secondary-50">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-secondary-500">Aktiv</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-secondary-500">Durchschnittspreis</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-secondary-50">
              {stats.avgPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-secondary-500">Gesamtumsatz</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-secondary-50">
              {stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-secondary-600" />
            <input
              type="text"
              placeholder="Suche nach Artikelnummer oder Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Articles list */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-500 dark:text-secondary-500">Lade Artikel...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-secondary-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-secondary-50">Keine Artikel gefunden</h3>
              <p className="mt-2 text-gray-500 dark:text-secondary-500">
                {searchTerm ? 'Versuchen Sie eine andere Suche.' : 'Erstellen Sie Ihren ersten Artikel.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => window.location.href = '/articles/new'}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ersten Artikel anlegen
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                <thead className="bg-gray-50 dark:bg-secondary-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Artikel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Preis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      MwSt.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Verkäufe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50 dark:bg-secondary-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-secondary-50">{article.name}</div>
                          <div className="text-sm text-gray-500 dark:text-secondary-500">{article.article_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-secondary-500">
                        {article.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-secondary-50">
                          {article.unit_price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-secondary-500">pro {article.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-secondary-500">
                        {article.vat_rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-secondary-50">{article.times_sold}x</div>
                        {article.total_revenue > 0 && (
                          <div className="text-sm text-gray-500 dark:text-secondary-500">
                            {article.total_revenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          article.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-secondary-700 text-gray-800 dark:text-secondary-100'
                        }`}>
                          {article.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => window.location.href = `/articles/${article.id}`}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          Bearbeiten
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
