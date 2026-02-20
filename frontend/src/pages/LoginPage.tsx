import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authAPI, settingsAPI } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);

  // Fetch organization info
  const { data: organization } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await settingsAPI.getOrganization();
      return response.data;
    },
    retry: 1,
  });

  const organizationName = organization?.name || 'kadr-Verein';
  const organizationLogo = organization?.logo;

  const loginMutation = useMutation({
    mutationFn: () => authAPI.login(email, password),
    onSuccess: (response) => {
      setAuth(response.data.token, response.data.user);
      // Reload page to ensure App.tsx useEffect runs and loads organization
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Login fehlgeschlagen');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img src="/kadr-logo.svg" alt="kadr logo" className="h-12 w-12" />
            {organizationLogo && (
              <img 
                src={`${API_URL}${organizationLogo}`} 
                alt="Vereinslogo" 
                className="h-12 w-auto object-contain"
              />
            )}
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
            {organizationName}
          </h2>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Melde dich an, um fortzufahren
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1"
                placeholder="deine@email.de"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="btn btn-primary w-full"
          >
            {loginMutation.isPending ? 'Wird angemeldet...' : 'Anmelden'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Noch kein Account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Jetzt registrieren
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
