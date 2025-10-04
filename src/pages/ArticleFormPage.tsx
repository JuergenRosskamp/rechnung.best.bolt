import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ArticlePriceManagement } from '../components/ArticlePriceManagement';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

const articleSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().optional(),
  category: z.string().min(1, 'Kategorie ist erforderlich'),
  unit: z.string().default('pcs'),
  unit_price: z.coerce.number().min(0, 'Preis muss mindestens 0 sein'),
  vat_rate: z.coerce.number().min(0).max(100),
  cost_price: z.coerce.number().optional(),
  is_service: z.boolean().default(false),
});

type ArticleForm = z.infer<typeof articleSchema>;

export function ArticleFormPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [articleUnit, setArticleUnit] = useState<string>('pcs');
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ArticleForm>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      unit: 'pcs',
      vat_rate: 19,
      is_service: false,
    },
  });

  const loadArticle = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      Object.keys(data).forEach((key) => {
        if (key in articleSchema.shape) {
          setValue(key as keyof ArticleForm, data[key as keyof typeof data]);
        }
      });
      setArticleUnit(data.unit || 'pcs');
    } catch (error) {
      setError('Fehler beim Laden des Artikels');
    }
  }, [setValue]);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id !== 'new' && id !== 'articles') {
      setArticleId(id);
      loadArticle(id);
    }
  }, [loadArticle]);

  const onSubmit = async (data: ArticleForm) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      let articleNumber = '';
      if (!articleId) {
        const { count } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.tenant_id);

        articleNumber = `A${String((count || 0) + 1).padStart(5, '0')}`;
      }

      const articleData = {
        ...data,
        tenant_id: user.tenant_id,
        article_number: articleNumber || undefined,
        created_by: user.id,
      };

      if (articleId) {
        const { error: updateError } = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', articleId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('articles')
          .insert(articleData);

        if (insertError) throw insertError;
      }

      window.location.href = '/articles';
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Fehler beim Speichern des Artikels');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/articles'}
            className="p-2 hover:bg-gray-100 dark:bg-secondary-700 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-secondary-50">
              {articleId ? 'Artikel bearbeiten' : 'Neuer Artikel'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-secondary-500">
              Erfassen Sie alle relevanten Artikeldaten
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-secondary-50">Artikelinformationen</h2>

            <div>
              <label className="flex items-center">
                <input
                  {...register('is_service')}
                  type="checkbox"
                  className="w-4 h-4 text-primary-600"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-secondary-200">Dies ist eine Dienstleistung (kein physisches Produkt)</span>
              </label>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                Artikelbezeichnung *
              </label>
              <input
                {...register('name')}
                type="text"
                id="name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="z.B. Beratungsstunde, Produkt XY"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                Beschreibung
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Detaillierte Beschreibung des Artikels..."
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                Kategorie *
              </label>
              <input
                {...register('category')}
                type="text"
                id="category"
                className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="z.B. Dienstleistungen, Produkte, Material"
              />
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-secondary-50">Preise & Einheiten</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Einheit
                </label>
                <select
                  {...register('unit')}
                  id="unit"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="pcs">Stück</option>
                  <option value="hours">Stunden</option>
                  <option value="days">Tage</option>
                  <option value="km">Kilometer</option>
                  <option value="m">Meter</option>
                  <option value="m2">Quadratmeter</option>
                  <option value="m3">Kubikmeter</option>
                  <option value="kg">Kilogramm</option>
                  <option value="l">Liter</option>
                </select>
              </div>

              <div>
                <label htmlFor="vat_rate" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  MwSt.-Satz (%)
                </label>
                <select
                  {...register('vat_rate')}
                  id="vat_rate"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="0">0% (steuerfrei)</option>
                  <option value="7">7% (ermäßigt)</option>
                  <option value="19">19% (Regelsteuersatz)</option>
                </select>
              </div>

              <div>
                <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Verkaufspreis (netto) *
                </label>
                <div className="relative">
                  <input
                    {...register('unit_price')}
                    type="number"
                    step="0.01"
                    id="unit_price"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-secondary-500">€</span>
                </div>
                {errors.unit_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.unit_price.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="cost_price" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Einkaufspreis (optional)
                </label>
                <div className="relative">
                  <input
                    {...register('cost_price')}
                    type="number"
                    step="0.01"
                    id="cost_price"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-secondary-500">€</span>
                </div>
              </div>
            </div>
          </div>

          {articleId && (
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
              <ArticlePriceManagement articleId={articleId} articleUnit={articleUnit} />
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => window.location.href = '/articles'}
              className="px-6 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {isLoading ? 'Speichert...' : 'Artikel speichern'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
