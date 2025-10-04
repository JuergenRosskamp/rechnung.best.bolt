import { LayoutDashboard, Users, FileText, Package, Plus } from 'lucide-react';
import { useState } from 'react';

export function MobileBottomNav() {
  const [activeRoute] = useState(window.location.pathname);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Kunden', href: '/customers', icon: Users },
    { name: 'Erstellen', href: '#', icon: Plus, isAction: true },
    { name: 'Rechnungen', href: '/invoices', icon: FileText },
    { name: 'Artikel', href: '/articles', icon: Package },
  ];

  const isActive = (href: string) => {
    return activeRoute === href || activeRoute.startsWith(href + '/');
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault();

    const menu = document.createElement('div');
    menu.className = 'fixed inset-0 z-50 animate-fade-in';
    menu.innerHTML = `
      <div class="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" id="menu-backdrop"></div>
      <div class="absolute bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm animate-slide-up">
        <div class="bg-white dark:bg-secondary-800 rounded-2xl shadow-soft-lg border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div class="p-2 space-y-1">
            <a href="/invoices/new" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors touch-target">
              <div class="p-2 bg-primary-100 dark:bg-primary-500/10 rounded-lg">
                <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-secondary-900 dark:text-secondary-50">Neue Rechnung</p>
                <p class="text-xs text-secondary-500">Rechnung erstellen</p>
              </div>
            </a>
            <a href="/customers/new" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors touch-target">
              <div class="p-2 bg-success-100 dark:bg-success-500/10 rounded-lg">
                <svg class="w-5 h-5 text-success-600 dark:text-success-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-secondary-900 dark:text-secondary-50">Neuer Kunde</p>
                <p class="text-xs text-secondary-500">Kunde hinzufügen</p>
              </div>
            </a>
            <a href="/articles/new" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors touch-target">
              <div class="p-2 bg-warning-100 dark:bg-warning-500/10 rounded-lg">
                <svg class="w-5 h-5 text-warning-600 dark:text-warning-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 4.27l9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-secondary-900 dark:text-secondary-50">Neuer Artikel</p>
                <p class="text-xs text-secondary-500">Artikel anlegen</p>
              </div>
            </a>
            <a href="/deliveries/new" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors touch-target">
              <div class="p-2 bg-accent-100 dark:bg-accent-500/10 rounded-lg">
                <svg class="w-5 h-5 text-accent-600 dark:text-accent-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-secondary-900 dark:text-secondary-50">Neue Lieferung</p>
                <p class="text-xs text-secondary-500">Lieferung anlegen</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(menu);

    const backdrop = menu.querySelector('#menu-backdrop');
    backdrop?.addEventListener('click', () => {
      menu.remove();
    });
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-secondary-900/95 backdrop-blur-md border-t border-secondary-200 dark:border-secondary-700 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.isAction) {
            return (
              <button
                key={item.name}
                onClick={handleCreateClick}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-target relative group"
              >
                <div className="absolute -top-6 w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-soft-lg group-active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-transparent mt-6">
                  {item.name}
                </span>
              </button>
            );
          }

          return (
            <a
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all touch-target ${
                active
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
              <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                {item.name}
              </span>
              {active && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-600 dark:bg-primary-400 rounded-full" />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
