import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Save, Upload, Eye, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import { invoiceTemplates, getTemplateById, type InvoiceTemplate } from '../lib/invoiceTemplates';

interface LayoutConfig {
  id?: string;
  template_name: string;
  logo_url: string | null;
  logo_width: number;
  logo_height: number;
  logo_position: 'top-left' | 'top-center' | 'top-right';
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  font_family: 'helvetica' | 'times' | 'courier';
  font_size_base: number;
  font_size_heading: number;
  show_company_slogan: boolean;
  company_slogan: string;
  header_background_color: string;
  header_text_color: string;
  footer_text: string;
  show_page_numbers: boolean;
  show_line_numbers: boolean;
  show_tax_breakdown: boolean;
  show_bank_details: boolean;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
}

export function InvoiceLayoutPage() {
  const { user } = useAuthStore();
  const { toast, success, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [config, setConfig] = useState<LayoutConfig>({
    template_name: 'modern',
    logo_url: null,
    logo_width: 120,
    logo_height: 40,
    logo_position: 'top-left',
    primary_color: '#0ea5e9',
    secondary_color: '#64748b',
    accent_color: '#0284c7',
    text_color: '#1e293b',
    font_family: 'helvetica',
    font_size_base: 10,
    font_size_heading: 20,
    show_company_slogan: true,
    company_slogan: '',
    header_background_color: '#ffffff',
    header_text_color: '#1e293b',
    footer_text: '',
    show_page_numbers: true,
    show_line_numbers: true,
    show_tax_breakdown: true,
    show_bank_details: true,
    margin_top: 20,
    margin_bottom: 20,
    margin_left: 20,
    margin_right: 20,
  });

  useEffect(() => {
    loadLayout();
  }, [user]);

  const loadLayout = async () => {
    if (!user) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData) return;

      const { data: layoutData } = await supabase
        .from('invoice_layouts')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .eq('is_default', true)
        .single();

      if (layoutData) {
        setConfig({
          id: layoutData.id,
          template_name: layoutData.template_name,
          logo_url: layoutData.logo_url,
          logo_width: layoutData.logo_width,
          logo_height: layoutData.logo_height,
          logo_position: layoutData.logo_position,
          primary_color: layoutData.primary_color,
          secondary_color: layoutData.secondary_color,
          accent_color: layoutData.accent_color,
          text_color: layoutData.text_color,
          font_family: layoutData.font_family,
          font_size_base: layoutData.font_size_base,
          font_size_heading: layoutData.font_size_heading,
          show_company_slogan: layoutData.show_company_slogan,
          company_slogan: layoutData.company_slogan || '',
          header_background_color: layoutData.header_background_color,
          header_text_color: layoutData.header_text_color,
          footer_text: layoutData.footer_text || '',
          show_page_numbers: layoutData.show_page_numbers,
          show_line_numbers: layoutData.show_line_numbers,
          show_tax_breakdown: layoutData.show_tax_breakdown,
          show_bank_details: layoutData.show_bank_details,
          margin_top: layoutData.margin_top,
          margin_bottom: layoutData.margin_bottom,
          margin_left: layoutData.margin_left,
          margin_right: layoutData.margin_right,
        });
        setSelectedTemplate(layoutData.template_name);
        setLogoPreview(layoutData.logo_url);
      }
    } catch (err) {
      console.error('Error loading layout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: InvoiceTemplate) => {
    setSelectedTemplate(template.id);
    setConfig(prev => ({
      ...prev,
      ...template.config,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateLogoFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Nur PNG, JPG, JPEG und WebP Dateien sind erlaubt' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Die Datei darf maximal 5 MB groß sein' };
    }

    if (file.name.length > 255) {
      return { valid: false, error: 'Der Dateiname ist zu lang' };
    }

    return { valid: true };
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;

    const validation = validateLogoFile(logoFile);
    if (!validation.valid) {
      showError(validation.error || 'Ungültige Datei');
      return null;
    }

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData) return null;

      const fileExt = logoFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${userData.tenant_id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('tenant-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading logo:', err);
      showError('Fehler beim Hochladen des Logos');
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      let logoUrl = config.logo_url;
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      const layoutData = {
        tenant_id: userData.tenant_id,
        template_name: config.template_name,
        logo_url: logoUrl,
        logo_width: config.logo_width,
        logo_height: config.logo_height,
        logo_position: config.logo_position,
        primary_color: config.primary_color,
        secondary_color: config.secondary_color,
        accent_color: config.accent_color,
        text_color: config.text_color,
        font_family: config.font_family,
        font_size_base: config.font_size_base,
        font_size_heading: config.font_size_heading,
        show_company_slogan: config.show_company_slogan,
        company_slogan: config.company_slogan,
        header_background_color: config.header_background_color,
        header_text_color: config.header_text_color,
        footer_text: config.footer_text,
        show_page_numbers: config.show_page_numbers,
        show_line_numbers: config.show_line_numbers,
        show_tax_breakdown: config.show_tax_breakdown,
        show_bank_details: config.show_bank_details,
        margin_top: config.margin_top,
        margin_bottom: config.margin_bottom,
        margin_left: config.margin_left,
        margin_right: config.margin_right,
        is_default: true,
      };

      if (config.id) {
        const { error } = await supabase
          .from('invoice_layouts')
          .update(layoutData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('invoice_layouts')
          .insert(layoutData)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id, logo_url: logoUrl }));
        }
      }

      success('Layout erfolgreich gespeichert');
      setLogoFile(null);
    } catch (err) {
      console.error('Error saving layout:', err);
      showError('Fehler beim Speichern des Layouts');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const template = getTemplateById(selectedTemplate);
    if (template) {
      setConfig(prev => ({
        ...prev,
        ...template.config,
      }));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-secondary-500">Lädt...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-secondary-50 mb-2">Rechnungslayout</h1>
          <p className="text-gray-600 dark:text-secondary-400">Gestalten Sie Ihre Rechnungen individuell nach Ihren Wünschen</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Selection */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-secondary-50 mb-4">Design-Vorlage wählen</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {invoiceTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center text-center min-h-[140px] ${
                      selectedTemplate === template.id
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 dark:border-secondary-700 hover:border-gray-300 dark:border-secondary-600'
                    }`}
                  >
                    <div className="text-3xl mb-2 flex-shrink-0">{template.preview}</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-secondary-50 mb-1 line-clamp-1 w-full">{template.name}</div>
                    <div className="text-xs text-gray-500 dark:text-secondary-500 line-clamp-3 leading-tight w-full">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Upload */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-secondary-50 mb-4">Firmenlogo</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                    Logo hochladen
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="block w-full text-sm text-gray-500 dark:text-secondary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                    />
                  </div>
                  {logoPreview && (
                    <div className="mt-3">
                      <img src={logoPreview} alt="Logo Preview" className="h-16 object-contain" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                      Position
                    </label>
                    <select
                      value={config.logo_position}
                      onChange={(e) => setConfig({ ...config, logo_position: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      <option value="top-left">Oben Links</option>
                      <option value="top-center">Oben Mitte</option>
                      <option value="top-right">Oben Rechts</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                      Breite (mm)
                    </label>
                    <input
                      type="number"
                      value={config.logo_width}
                      onChange={(e) => setConfig({ ...config, logo_width: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-secondary-50 mb-4">Farben</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                    Primärfarbe
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.primary_color}
                      onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                      className="h-10 w-16 rounded border border-gray-300 dark:border-secondary-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.primary_color}
                      onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                    Akzentfarbe
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.accent_color}
                      onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                      className="h-10 w-16 rounded border border-gray-300 dark:border-secondary-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.accent_color}
                      onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-secondary-50 mb-4">Schrift</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                    Schriftart
                  </label>
                  <select
                    value={config.font_family}
                    onChange={(e) => setConfig({ ...config, font_family: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  >
                    <option value="helvetica">Helvetica</option>
                    <option value="times">Times</option>
                    <option value="courier">Courier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                    Basisgröße
                  </label>
                  <input
                    type="number"
                    value={config.font_size_base}
                    onChange={(e) => setConfig({ ...config, font_size_base: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1">
                    Überschrift
                  </label>
                  <input
                    type="number"
                    value={config.font_size_heading}
                    onChange={(e) => setConfig({ ...config, font_size_heading: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-secondary-50 mb-4">Optionen</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.show_company_slogan}
                    onChange={(e) => setConfig({ ...config, show_company_slogan: e.target.checked })}
                    className="w-4 h-4 text-sky-600 border-gray-300 dark:border-secondary-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-secondary-200">Firmenslogan anzeigen</span>
                </label>
                {config.show_company_slogan && (
                  <input
                    type="text"
                    value={config.company_slogan}
                    onChange={(e) => setConfig({ ...config, company_slogan: e.target.value })}
                    placeholder="Ihr Slogan..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.show_line_numbers}
                    onChange={(e) => setConfig({ ...config, show_line_numbers: e.target.checked })}
                    className="w-4 h-4 text-sky-600 border-gray-300 dark:border-secondary-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-secondary-200">Positionsnummern anzeigen</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.show_tax_breakdown}
                    onChange={(e) => setConfig({ ...config, show_tax_breakdown: e.target.checked })}
                    className="w-4 h-4 text-sky-600 border-gray-300 dark:border-secondary-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-secondary-200">Steueraufschlüsselung anzeigen</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.show_bank_details}
                    onChange={(e) => setConfig({ ...config, show_bank_details: e.target.checked })}
                    className="w-4 h-4 text-sky-600 border-gray-300 dark:border-secondary-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-secondary-200">Bankverbindung anzeigen</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Preview & Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-gray-200 dark:border-secondary-700 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-secondary-50 mb-4">Vorschau</h2>
              <div className="bg-gray-100 dark:bg-secondary-700 rounded-lg p-6 mb-4 aspect-[1/1.41] flex items-center justify-center">
                <div className="text-center text-gray-500 dark:text-secondary-500">
                  <Eye className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Vorschau wird generiert</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-gray-300 dark:disabled:bg-secondary-700"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Speichert...' : 'Layout speichern'}
                </button>
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-secondary-700 text-gray-700 dark:text-secondary-200 rounded-lg hover:bg-gray-200 dark:bg-secondary-600"
                >
                  <RotateCcw className="w-4 h-4" />
                  Zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} />}
    </Layout>
  );
}
