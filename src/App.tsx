import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { authService } from './lib/auth';
import LandingPage from './pages/LandingPage';
import ImpressumPage from './pages/ImpressumPage';
import DatenschutzPage from './pages/DatenschutzPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerFormPage } from './pages/CustomerFormPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceFormPage } from './pages/InvoiceFormPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { ArticleFormPage } from './pages/ArticleFormPage';
import { SettingsPage } from './pages/SettingsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { VehicleFormPage } from './pages/VehicleFormPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { CashbookPage } from './pages/CashbookPage';
import { CashbookEntryPage } from './pages/CashbookEntryPage';
import { CashCountPage } from './pages/CashCountPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import DeliveryLocationsPage from './pages/DeliveryLocationsPage';
import { InvoiceLayoutPage } from './pages/InvoiceLayoutPage';
import { QuotesPage } from './pages/QuotesPage';
import { QuoteFormPage } from './pages/QuoteFormPage';
import { DunningPage } from './pages/DunningPage';
import { RecurringInvoicesPage } from './pages/RecurringInvoicesPage';
import { SupportPage } from './pages/SupportPage';
import { AdminTicketsPage } from './pages/AdminTicketsPage';

type Page = 'landing' | 'impressum' | 'datenschutz' | 'login' | 'register' | 'dashboard' | 'customers' | 'customer_form' | 'invoices' | 'invoice_detail' | 'invoice_form' | 'articles' | 'article_form' | 'vehicles' | 'vehicle_form' | 'deliveries' | 'delivery_locations' | 'cashbook' | 'cashbook_entry' | 'cash_count' | 'settings' | 'invoice_layout' | 'quotes' | 'quote_form' | 'dunning' | 'recurring_invoices' | 'support' | 'admin_tickets';

function App() {
  const { isAuthenticated, setUser, setTenant, setSubscription, setLoading, isLoading } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  const updatePage = (path: string) => {
    if (path.includes('/customers/new') || (path.includes('/customers/') && path.split('/').length > 2 && path.split('/')[2] !== '')) {
      setCurrentPage('customer_form');
    } else if (path.includes('/customers')) {
      setCurrentPage('customers');
    } else if (path.includes('/invoices/new')) {
      setCurrentPage('invoice_form');
    } else if (path.includes('/invoices/') && path.split('/').length > 2 && path.split('/')[2] !== '' && path.split('/')[2] !== 'new') {
      setCurrentPage('invoice_detail');
    } else if (path.includes('/invoices')) {
      setCurrentPage('invoices');
    } else if (path.includes('/articles/new') || (path.includes('/articles/') && path.split('/').length > 2 && path.split('/')[2] !== '')) {
      setCurrentPage('article_form');
    } else if (path.includes('/articles')) {
      setCurrentPage('articles');
    } else if (path.includes('/vehicles/new') || (path.includes('/vehicles/') && path.split('/').length > 2 && path.split('/')[2] !== '')) {
      setCurrentPage('vehicle_form');
    } else if (path.includes('/vehicles')) {
      setCurrentPage('vehicles');
    } else if (path.includes('/deliveries')) {
      setCurrentPage('deliveries');
    } else if (path.includes('/delivery-locations')) {
      setCurrentPage('delivery_locations');
    } else if (path.includes('/cashbook/new')) {
      setCurrentPage('cashbook_entry');
    } else if (path.includes('/cashbook/count')) {
      setCurrentPage('cash_count');
    } else if (path.includes('/cashbook')) {
      setCurrentPage('cashbook');
    } else if (path.includes('/invoice-layout')) {
      setCurrentPage('invoice_layout');
    } else if (path.includes('/quotes/new') || (path.includes('/quotes/') && path.split('/').length > 2 && path.split('/')[2] !== '')) {
      setCurrentPage('quote_form');
    } else if (path.includes('/quotes')) {
      setCurrentPage('quotes');
    } else if (path.includes('/dunning')) {
      setCurrentPage('dunning');
    } else if (path.includes('/recurring-invoices')) {
      setCurrentPage('recurring_invoices');
    } else if (path.includes('/admin/tickets')) {
      setCurrentPage('admin_tickets');
    } else if (path.includes('/support')) {
      setCurrentPage('support');
    } else if (path.includes('/settings')) {
      setCurrentPage('settings');
    } else {
      setCurrentPage('dashboard');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const result = await authService.getCurrentUser();
        if (result) {
          setUser(result.user);
          setTenant(result.tenant);
          setSubscription(result.subscription);

          // Determine page from URL
          updatePage(window.location.pathname);
        } else {
          setLoading(false);

          // Determine page for non-authenticated users
          const path = window.location.pathname;
          if (path.includes('/register')) {
            setCurrentPage('register');
          } else if (path.includes('/login')) {
            setCurrentPage('login');
          } else if (path.includes('/impressum')) {
            setCurrentPage('impressum');
          } else if (path.includes('/datenschutz')) {
            setCurrentPage('datenschutz');
          } else {
            setCurrentPage('landing');
          }
        }
      } catch (error) {
        setLoading(false);
        setCurrentPage('login');
      }
    };

    initAuth();

    // Handle browser navigation (back/forward buttons)
    const handlePopState = () => {
      updatePage(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setUser, setTenant, setSubscription, setLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-secondary-700 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-secondary-400">Lädt...</p>
        </div>
      </div>
    );
  }

  // Public routes
  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return <RegisterPage />;
    }
    if (currentPage === 'login') {
      return <LoginPage />;
    }
    if (currentPage === 'impressum') {
      return <ImpressumPage />;
    }
    if (currentPage === 'datenschutz') {
      return <DatenschutzPage />;
    }
    return <LandingPage />;
  }

  // Protected routes
  switch (currentPage) {
    case 'customers':
      return <CustomersPage />;
    case 'customer_form':
      return <CustomerFormPage />;
    case 'invoices':
      return <InvoicesPage />;
    case 'invoice_detail':
      return <InvoiceDetailPage />;
    case 'invoice_form':
      return <InvoiceFormPage />;
    case 'articles':
      return <ArticlesPage />;
    case 'article_form':
      return <ArticleFormPage />;
    case 'vehicles':
      return <VehiclesPage />;
    case 'vehicle_form':
      return <VehicleFormPage />;
    case 'deliveries':
      return <DeliveriesPage />;
    case 'delivery_locations':
      return <DeliveryLocationsPage />;
    case 'cashbook':
      return <CashbookPage />;
    case 'cashbook_entry':
      return <CashbookEntryPage />;
    case 'cash_count':
      return <CashCountPage />;
    case 'settings':
      return <SettingsPage />;
    case 'invoice_layout':
      return <InvoiceLayoutPage />;
    case 'quotes':
      return <QuotesPage />;
    case 'quote_form':
      return <QuoteFormPage />;
    case 'dunning':
      return <DunningPage />;
    case 'recurring_invoices':
      return <RecurringInvoicesPage />;
    case 'support':
      return <SupportPage />;
    case 'admin_tickets':
      return <AdminTicketsPage />;
    case 'dashboard':
    default:
      return <DashboardPage />;
  }
}

export default App;
