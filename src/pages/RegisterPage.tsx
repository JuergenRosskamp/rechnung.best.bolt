import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { authService } from '../lib/auth';
import { useAuthStore } from '../store/authStore';

import { getErrorMessage } from '../lib/errors';
const registerSchema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  password: z
    .string()
    .min(12, 'Passwort muss mindestens 12 Zeichen lang sein')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Ziffer enthalten'),
  companyName: z.string().min(2, 'Firmenname ist erforderlich'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Sie müssen die AGB und Datenschutzerklärung akzeptieren',
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setTenant, setSubscription } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('');
      setIsLoading(true);

      const result = await authService.register(data);

      setUser(result.user);
      setTenant(result.tenant);
      setSubscription(result.subscription);

      window.location.href = '/onboarding';
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-primary-100 dark:from-secondary-900 dark:to-secondary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-secondary-50">Konto erstellen</h1>
            <p className="text-gray-600 dark:text-secondary-400 mt-2">14 Tage kostenlos testen, keine Kreditkarte erforderlich</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Vorname (optional)
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  id="firstName"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Max"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                  Nachname (optional)
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  id="lastName"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Mustermann"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                Firmenname *
              </label>
              <input
                {...register('companyName')}
                type="text"
                id="companyName"
                className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Musterfirma GmbH"
                disabled={isLoading}
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                E-Mail-Adresse *
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ihre.email@beispiel.de"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                Passwort *
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                className="w-full px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Mindestens 12 Zeichen"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-secondary-500">
                Passwort muss mindestens 12 Zeichen, einen Groß- und Kleinbuchstaben sowie eine Ziffer enthalten
              </p>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...register('acceptTerms')}
                  type="checkbox"
                  id="acceptTerms"
                  className="w-4 h-4 text-primary-600 border-gray-300 dark:border-secondary-600 rounded focus:ring-primary-500"
                  disabled={isLoading}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="acceptTerms" className="text-gray-700 dark:text-secondary-200">
                  Ich akzeptiere die{' '}
                  <a href="/agb" className="text-primary-600 hover:text-primary-500" target="_blank">
                    AGB
                  </a>{' '}
                  und{' '}
                  <a href="/datenschutz" className="text-primary-600 hover:text-primary-500" target="_blank">
                    Datenschutzerklärung
                  </a>
                </label>
                {errors.acceptTerms && (
                  <p className="mt-1 text-red-600">{errors.acceptTerms.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Registrierung läuft...' : 'Kostenlos registrieren'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-secondary-400">
              Bereits ein Konto?{' '}
              <a href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                Jetzt anmelden
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-secondary-500">
          <p>© 2025 rechnung.best. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </div>
  );
}
