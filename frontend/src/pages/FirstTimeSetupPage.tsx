import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Building2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const TIMEZONES = [
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/Rome',
  'Europe/Brussels',
  'Europe/Budapest',
  'UTC',
];

export default function FirstTimeSetupPage() {
  const [organizationName, setOrganizationName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timezone, setTimezone] = useState('Europe/Berlin');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const setAuth = useAuthStore((state) => state.setAuth);

  const setupMutation = useMutation({
    mutationFn: async () => {
      if (!organizationName.trim()) {
        throw new Error('Vereinsname ist erforderlich');
      }
      if (!adminEmail.trim()) {
        throw new Error('Admin E-Mail ist erforderlich');
      }
      if (adminPassword.length < 6) {
        throw new Error('Passwort muss mindestens 6 Zeichen lang sein');
      }
      if (adminPassword !== confirmPassword) {
        throw new Error('Passwörter stimmen nicht überein');
      }

      const response = await axios.post(`${API_URL}/api/admin/first-setup`, {
        organizationName,
        adminEmail,
        adminPassword,
        timezone,
      });

      return response.data;
    },
    onSuccess: (data) => {
      // Auto-login
      setAuth(data.token, data.user);
      // Reload to get organization data
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    },
    onError: (error: any) => {
      let message = 'Setup fehlgeschlagen';
      if (error.message) {
        message = error.message;
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      }
      setError(message);
    },
  });

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!organizationName.trim()) {
        setError('Vereinsname ist erforderlich');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setupMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-primary-600" />
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            kadr
          </h1>
          <p className="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium">
            Designed for teams
          </p>
          <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
            {step === 1 ? 'Dein Verein' : 'Admin Account'}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          <div className={`h-2 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-primary-600' : 'bg-gray-300'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`} />
        </div>

        <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Organization */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Vereinsname
                </label>
                <input
                  id="org-name"
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="input mt-1"
                  placeholder="z.B. SV Musterdorf"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Der Name deines Sportvereins
                </p>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Zeitzone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input mt-1"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Admin Account */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Admin E-Mail
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="input mt-1"
                  placeholder="admin@verein.de"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Passwort
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  minLength={6}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="input mt-1"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Mindestens 6 Zeichen
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Passwort bestätigen
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input mt-1"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 btn btn-secondary"
              >
                Zurück
              </button>
            )}
            <button
              type="submit"
              disabled={setupMutation.isPending}
              className="flex-1 btn btn-primary"
            >
              {setupMutation.isPending
                ? 'Wird konfiguriert...'
                : step === 1
                ? 'Weiter'
                : 'Setup abschließen'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Schritt {step} von 2
          </p>
        </form>
      </div>
    </div>
  );
}
