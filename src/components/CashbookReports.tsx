import { useState, useEffect } from 'react';
import { X, Download, TrendingUp, TrendingDown, PieChart, BarChart3, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { exportToDatabank } from '../lib/datevExport';

interface CashbookReportsProps {
  onClose: () => void;
}

interface CategoryStats {
  category_name: string;
  category_code: string;
  total: number;
  count: number;
  percentage: number;
}

export function CashbookReports({ onClose }: CashbookReportsProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'overview' | 'categories' | 'daily' | 'datev'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [skr, setSKR] = useState<'SKR03' | 'SKR04'>('SKR03');

  const { user } = useAuthStore();

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate, reportType]);

  const loadReportData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: entries, error } = await supabase
        .from('cashbook_entries')
        .select(`
          *,
          category:cashbook_categories(category_code, category_name)
        `)
        .eq('tenant_id', user.tenant_id)
        .eq('is_cancelled', false)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (error) throw error;

      if (!entries) return;

      const totalIncome = entries
        .filter(e => e.document_type === 'income')
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);

      const totalExpense = entries
        .filter(e => e.document_type === 'expense')
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);

      setStats({
        totalIncome,
        totalExpense,
        netResult: totalIncome - totalExpense,
        transactionCount: entries.length,
        averageIncome: entries.filter(e => e.document_type === 'income').length > 0
          ? totalIncome / entries.filter(e => e.document_type === 'income').length
          : 0,
        averageExpense: entries.filter(e => e.document_type === 'expense').length > 0
          ? totalExpense / entries.filter(e => e.document_type === 'expense').length
          : 0,
      });

      if (reportType === 'categories') {
        const categoryMap = new Map<string, { name: string; total: number; count: number }>();

        entries.forEach(entry => {
          const categoryName = entry.category?.category_name || 'Nicht kategorisiert';
          const categoryCode = entry.category?.category_code || 'UNKNOWN';
          const key = `${categoryCode}:${categoryName}`;

          if (!categoryMap.has(key)) {
            categoryMap.set(key, { name: categoryName, total: 0, count: 0 });
          }

          const cat = categoryMap.get(key)!;
          cat.total += Math.abs(entry.amount);
          cat.count += 1;
        });

        const totalAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.total, 0);

        const categoriesArray: CategoryStats[] = Array.from(categoryMap.entries()).map(([key, data]) => {
          const [code, name] = key.split(':');
          return {
            category_code: code,
            category_name: name,
            total: data.total,
            count: data.count,
            percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
          };
        });

        categoriesArray.sort((a, b) => b.total - a.total);
        setCategoryStats(categoriesArray);
      }

      if (reportType === 'daily') {
        const dailyMap = new Map<string, { income: number; expense: number; count: number }>();

        entries.forEach(entry => {
          const date = entry.entry_date;

          if (!dailyMap.has(date)) {
            dailyMap.set(date, { income: 0, expense: 0, count: 0 });
          }

          const day = dailyMap.get(date)!;
          if (entry.document_type === 'income') {
            day.income += Math.abs(entry.amount);
          } else if (entry.document_type === 'expense') {
            day.expense += Math.abs(entry.amount);
          }
          day.count += 1;
        });

        const dailyArray = Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date,
            income: data.income,
            expense: data.expense,
            net: data.income - data.expense,
            count: data.count,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setDailyStats(dailyArray);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDATEVExport = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const blob = await exportToDatabank({
        tenantId: user.tenant_id,
        startDate,
        endDate,
        skr,
        includeVAT: true,
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `DATEV_Export_${startDate}_${endDate}_${skr}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting to DATEV:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-secondary-800 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-secondary-800 border-b border-gray-200 dark:border-secondary-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-secondary-50">Kassenbuch-Auswertungen</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-secondary-600 hover:text-gray-600 dark:text-secondary-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Period Selection */}
          <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">Von</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">Bis</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">Berichtstyp</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="overview">Übersicht</option>
                  <option value="categories">Nach Kategorien</option>
                  <option value="daily">Tagesübersicht</option>
                  <option value="datev">DATEV-Export</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Overview Report */}
              {reportType === 'overview' && stats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">Einnahmen</p>
                          <p className="mt-2 text-3xl font-bold text-green-900">
                            {stats.totalIncome.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0
                            })}
                          </p>
                          <p className="mt-1 text-xs text-green-700">
                            Ø {stats.averageIncome.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR'
                            })}
                          </p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-green-500" />
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-800">Ausgaben</p>
                          <p className="mt-2 text-3xl font-bold text-red-900">
                            {stats.totalExpense.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0
                            })}
                          </p>
                          <p className="mt-1 text-xs text-red-700">
                            Ø {stats.averageExpense.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR'
                            })}
                          </p>
                        </div>
                        <TrendingDown className="h-10 w-10 text-red-500" />
                      </div>
                    </div>

                    <div className={`border-2 rounded-lg p-6 ${
                      stats.netResult >= 0
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${
                            stats.netResult >= 0 ? 'text-blue-800' : 'text-orange-800'
                          }`}>
                            Netto-Ergebnis
                          </p>
                          <p className={`mt-2 text-3xl font-bold ${
                            stats.netResult >= 0 ? 'text-blue-900' : 'text-orange-900'
                          }`}>
                            {stats.netResult >= 0 ? '+' : ''}
                            {stats.netResult.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0
                            })}
                          </p>
                          <p className={`mt-1 text-xs ${
                            stats.netResult >= 0 ? 'text-blue-700' : 'text-orange-700'
                          }`}>
                            {stats.transactionCount} Buchungen
                          </p>
                        </div>
                        <PieChart className={`h-10 w-10 ${
                          stats.netResult >= 0 ? 'text-blue-500' : 'text-orange-500'
                        }`} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={exportToPDF}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Als PDF drucken
                    </button>
                  </div>
                </div>
              )}

              {/* Category Report */}
              {reportType === 'categories' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-secondary-50">Auswertung nach Kategorien</h3>
                  <div className="bg-white dark:bg-secondary-700/30 rounded-lg border border-gray-200 dark:border-secondary-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                      <thead className="bg-gray-50 dark:bg-secondary-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Kategorie
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Anzahl
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Summe
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Anteil
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Visualisierung
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-secondary-700/30 divide-y divide-gray-200 dark:divide-secondary-700">
                        {categoryStats.map((cat, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:bg-secondary-800">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-secondary-50">{cat.category_name}</div>
                              <div className="text-xs text-gray-500 dark:text-secondary-500">{cat.category_code}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-secondary-50">
                              {cat.count}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-secondary-50">
                              {cat.total.toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR'
                              })}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-secondary-50">
                              {cat.percentage.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-full bg-gray-200 dark:bg-secondary-600 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${cat.percentage}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Daily Report */}
              {reportType === 'daily' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-secondary-50">Tagesübersicht</h3>
                  <div className="bg-white dark:bg-secondary-700/30 rounded-lg border border-gray-200 dark:border-secondary-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                      <thead className="bg-gray-50 dark:bg-secondary-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Datum
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Einnahmen
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Ausgaben
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Netto
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                            Buchungen
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-secondary-700/30 divide-y divide-gray-200 dark:divide-secondary-700">
                        {dailyStats.map((day, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:bg-secondary-800">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-secondary-50">
                              {new Date(day.date).toLocaleDateString('de-DE', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-green-600 font-medium">
                              +{day.income.toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR'
                              })}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-red-600 font-medium">
                              -{day.expense.toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR'
                              })}
                            </td>
                            <td className={`px-6 py-4 text-right text-sm font-bold ${
                              day.net >= 0 ? 'text-blue-600' : 'text-orange-600'
                            }`}>
                              {day.net >= 0 ? '+' : ''}
                              {day.net.toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR'
                              })}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-secondary-50">
                              {day.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DATEV Export */}
              {reportType === 'datev' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">DATEV-Export</h3>
                    <p className="text-sm text-blue-800 mb-4">
                      Exportieren Sie Ihre Kassenbuch-Daten im DATEV-Format für Ihren Steuerberater.
                      Der Export enthält alle Buchungen im gewählten Zeitraum mit korrekter Kontenzuordnung.
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-blue-900 mb-2">
                        Kontenrahmen
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="SKR03"
                            checked={skr === 'SKR03'}
                            onChange={(e) => setSKR(e.target.value as 'SKR03' | 'SKR04')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="ml-2 text-sm text-blue-900">
                            SKR03 (Prozessgliederung) - Kasse: 1000
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="SKR04"
                            checked={skr === 'SKR04'}
                            onChange={(e) => setSKR(e.target.value as 'SKR03' | 'SKR04')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="ml-2 text-sm text-blue-900">
                            SKR04 (Bilanzgliederung) - Kasse: 1600
                          </span>
                        </label>
                      </div>
                    </div>

                    {stats && (
                      <div className="bg-white dark:bg-secondary-700/30 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 dark:text-secondary-400 mb-2">Export umfasst:</p>
                        <ul className="text-sm text-gray-900 dark:text-secondary-50 space-y-1">
                          <li>• {stats.transactionCount} Buchungen</li>
                          <li>• Zeitraum: {new Date(startDate).toLocaleDateString('de-DE')} bis {new Date(endDate).toLocaleDateString('de-DE')}</li>
                          <li>• Kontenrahmen: {skr}</li>
                          <li>• Format: DATEV ASCII (CSV)</li>
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={handleDATEVExport}
                      disabled={isLoading}
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      {isLoading ? 'Erstelle Export...' : 'DATEV-Export herunterladen'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
