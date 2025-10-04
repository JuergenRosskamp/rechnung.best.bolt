import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Building2, ArrowRight, Sparkles } from 'lucide-react';
import { authService } from '../lib/auth';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';

const loginSchema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setTenant, setSubscription } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      setIsLoading(true);

      const result = await authService.login(data);

      setUser(result.user);
      setTenant(result.tenant);
      setSubscription(result.subscription);

      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 relative overflow-hidden">
      {/* Gradient Mesh Background */}
      <div className="absolute inset-0 gradient-mesh opacity-60" />
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:block space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white dark:bg-secondary-800/80 backdrop-blur-sm rounded-2xl shadow-soft border border-white/20">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium text-secondary-700">Professionelle Rechnungsverwaltung</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-secondary-900 leading-tight tracking-tight">
                Willkommen bei<br />
                <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  rechnung.best
                </span>
              </h1>
              <p className="text-xl text-secondary-600 leading-relaxed">
                Die moderne Lösung für Ihre Rechnungsverwaltung, Lieferscheine und Kassenbuch.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white dark:bg-secondary-800/60 backdrop-blur-sm rounded-2xl shadow-soft border border-white/20">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900">Mandantenfähig</h3>
                  <p className="text-sm text-secondary-600 mt-1">Verwalten Sie mehrere Unternehmen in einem System</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white dark:bg-secondary-800/60 backdrop-blur-sm rounded-2xl shadow-soft border border-white/20">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <LogIn className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900">Sicher & Konform</h3>
                  <p className="text-sm text-secondary-600 mt-1">GoBD-konforme Archivierung und Datensicherheit</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto animate-scale-in">
            <div className="card p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-primary shadow-soft mb-4">
                  <LogIn className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-secondary-900">Anmelden</h2>
                <p className="text-secondary-600 mt-2">Melden Sie sich bei Ihrem Konto an</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl animate-slide-down">
                  <p className="text-sm text-error-800 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="email" className="label">
                    E-Mail-Adresse
                  </label>
                  <input
                    {...register('email')}
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="ihre@email.de"
                    className={`input ${errors.email ? 'input-error' : ''}`}
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-error-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="label">
                    Passwort
                  </label>
                  <input
                    {...register('password')}
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`input ${errors.password ? 'input-error' : ''}`}
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-error-600">{errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full group"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Wird angemeldet...
                    </>
                  ) : (
                    <>
                      Anmelden
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-secondary-200">
                <p className="text-center text-sm text-secondary-600">
                  Noch kein Konto?{' '}
                  <a
                    href="/register"
                    className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Jetzt registrieren
                  </a>
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-secondary-500 mt-6">
              Mit der Anmeldung stimmen Sie unseren{' '}
              <a href="#" className="text-secondary-700 hover:text-secondary-900 underline">
                Nutzungsbedingungen
              </a>{' '}
              zu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
