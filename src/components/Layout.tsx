import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Package, CreditCard, Settings, LogOut, Menu, X, Truck, ClipboardList, MapPin, Building2, ChevronRight, Palette, ChevronDown, FileCheck, AlertTriangle, Repeat, Headphones as HeadphonesIcon, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useDarkMode } from '../hooks/useDarkMode';
import { MobileBottomNav } from './MobileBottomNav';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Kunden', href: '/customers', icon: Users },
  { name: 'Angebote', href: '/quotes', icon: FileCheck },
  { name: 'Rechnungen', href: '/invoices', icon: FileText },
  { name: 'Abo-Rechnungen', href: '/recurring-invoices', icon: Repeat },
  { name: 'Mahnungen', href: '/dunning', icon: AlertTriangle },
  { name: 'Artikel', href: '/articles', icon: Package },
  { name: 'Fuhrpark', href: '/vehicles', icon: Truck },
  { name: 'Lieferungen', href: '/deliveries', icon: ClipboardList },
  { name: 'Lieferorte', href: '/delivery-locations', icon: MapPin },
  { name: 'Kassenbuch', href: '/cashbook', icon: CreditCard },
  { name: 'Support', href: '/support', icon: HeadphonesIcon },
  { name: 'Firmendaten', href: '/settings', icon: Settings },
  { name: 'Rechnungslayout', href: '/invoice-layout', icon: Palette },
];

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { user, tenant } = useAuthStore();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  useEffect(() => {
    loadTenantLogo();
  }, [user]);

  const loadTenantLogo = async () => {
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
        .select('logo_url')
        .eq('tenant_id', userData.tenant_id)
        .eq('is_default', true)
        .single();

      if (layoutData?.logo_url) {
        setLogoUrl(layoutData.logo_url);
      }
    } catch (err) {
      console.error('Error loading logo:', err);
    }
  };

  const isActive = (href: string) => {
    return window.location.pathname === href || window.location.pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-secondary-900/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-secondary-200 transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-secondary-200">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-secondary-900">rechnung.best</span>
            </a>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-xl hover:bg-secondary-100 transition-colors"
            >
              <X className="w-5 h-5 text-secondary-600" />
            </button>
          </div>

          {/* Tenant Info */}
          {tenant && (
            <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-500/5 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 truncate">{tenant.name}</p>
                  <p className="text-xs text-secondary-600 dark:text-secondary-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-secondary-700 hover:bg-secondary-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`w-5 h-5 transition-colors ${
                    active ? 'text-primary-600' : 'text-secondary-500 group-hover:text-secondary-700'
                  }`} />
                  <span className="flex-1">{item.name}</span>
                  {active && (
                    <ChevronRight className="w-4 h-4 text-primary-600" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Dark Mode Toggle & Logout */}
          <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 space-y-2">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-secondary-700 dark:text-secondary-300 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-all duration-200 touch-target"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {isDark ? 'Hell' : 'Dunkel'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-error-600 dark:text-error-400 rounded-xl hover:bg-error-50 dark:hover:bg-error-950 transition-all duration-200 touch-target"
            >
              <LogOut className="w-5 h-5" />
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col h-full bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700">
          {/* Desktop Header */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-secondary-200">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-secondary-900">rechnung.best</span>
                </>
              )}
            </a>
          </div>

          {/* Tenant Info */}
          {tenant && (
            <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-500/5 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 truncate">{tenant.name}</p>
                  <p className="text-xs text-secondary-600 dark:text-secondary-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-secondary-700 hover:bg-secondary-100'
                  }`}
                >
                  <item.icon className={`w-5 h-5 transition-colors ${
                    active ? 'text-primary-600' : 'text-secondary-500 group-hover:text-secondary-700'
                  }`} />
                  <span className="flex-1">{item.name}</span>
                  {active && (
                    <ChevronRight className="w-4 h-4 text-primary-600" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Dark Mode Toggle & Logout */}
          <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 space-y-2">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-secondary-700 dark:text-secondary-300 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-all duration-200 touch-target"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {isDark ? 'Hell' : 'Dunkel'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-error-600 dark:text-error-400 rounded-xl hover:bg-error-50 dark:hover:bg-error-950 transition-all duration-200 touch-target"
            >
              <LogOut className="w-5 h-5" />
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 h-16 px-4 bg-white/95 dark:bg-secondary-900/95 backdrop-blur-md border-b border-secondary-200 dark:border-secondary-700 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors touch-target"
          >
            <Menu className="w-6 h-6 text-secondary-700 dark:text-secondary-300" />
          </button>
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-secondary-900 dark:text-secondary-50">rechnung.best</span>
          </a>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors touch-target"
          >
            {isDark ? <Sun className="w-5 h-5 text-secondary-700 dark:text-secondary-300" /> : <Moon className="w-5 h-5 text-secondary-700 dark:text-secondary-300" />}
          </button>
        </header>

        {/* Page content */}
        <main className="min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
