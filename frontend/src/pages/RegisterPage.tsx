import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authAPI, settingsAPI } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'player' | 'trainer'>('player');
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

  const registerMutation = useMutation({
    mutationFn: () => {
      // Validate input
      if (!name.trim()) {
        throw new Error('Name ist erforderlich');
      }
      if (!email.trim()) {
        throw new Error('E-Mail ist erforderlich');
      }
      if (password.length < 6) {
        throw new Error('Passwort muss mindestens 6 Zeichen lang sein');
      }
      return authAPI.register({ name, email, password, role });
    },
    onSuccess: (response) => {
      setAuth(response.data.token, response.data.user);
      // Reload page to ensure App.tsx useEffect runs and loads organization
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    },
    onError: (error: any) => {
      let message = 'Registrierung fehlgeschlagen';
      
      if (error?.message) {
        message = error.message;
      } else if (error?.response?.data?.error) {
        message = error.response.data.error;
      }
      
      setError(message);
      console.error('Registration error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    registerMutation.mutate();
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
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Account erstellen
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1"
                placeholder="Max Mustermann"
              />
            </div>

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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rolle
              </label>
              <div className="mt-2 space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="player"
                    checked={role === 'player'}
                    onChange={(e) => setRole(e.target.value as 'player')}
                    className="mr-2"
                  />
                  <span>Spieler</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="trainer"
                    checked={role === 'trainer'}
                    onChange={(e) => setRole(e.target.value as 'trainer')}
                    className="mr-2"
                  />
                  <span>Trainer</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="btn btn-primary w-full"
          >
            {registerMutation.isPending ? 'Wird registriert...' : 'Registrieren'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Bereits registriert?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Jetzt anmelden
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
