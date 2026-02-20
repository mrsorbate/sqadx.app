import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { invitesAPI, authAPI, settingsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, token: authToken } = useAuthStore();
  const [showRegister, setShowRegister] = useState(false);

  // Registrierungsformular-State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

  const { data: invite, isLoading, error: inviteError } = useQuery({
    queryKey: ['invite', token],
    queryFn: async () => {
      const response = await invitesAPI.getInviteByToken(token!);
      return response.data;
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => invitesAPI.acceptInvite(token!),
    onSuccess: (response) => {
      navigate(`/teams/${response.data.team_id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Fehler beim Beitreten');
    },
  });

  const registerAndAcceptMutation = useMutation({
    mutationFn: async () => {
      // Check if this is a player invite (with predefined player data)
      if (invite?.player_name) {
        // Use the new register-with-invite endpoint
        const response = await invitesAPI.registerWithInvite(token!, { email, password });
        return response;
      } else {
        // Regular registration flow
        const registerResponse = await authAPI.register({ name, email, password, role: 'player' });
        return registerResponse;
      }
    },
    onSuccess: async (registerResponse) => {
      // Set auth after registration
      const authStore = useAuthStore.getState();
      authStore.setAuth(registerResponse.data.token, registerResponse.data.user);
      
      // For player invites, registration already accepted the invite
      if (invite?.player_name) {
        navigate(`/teams/${invite.team_id}`);
      } else {
        // For regular invites, need to accept separately
        try {
          const acceptResponse = await invitesAPI.acceptInvite(token!);
          navigate(`/teams/${acceptResponse.data.team_id}`);
        } catch (err: any) {
          setError(err.response?.data?.error || 'Fehler beim Beitreten');
        }
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Registrierung fehlgeschlagen');
    },
  });

  const handleAccept = () => {
    setError('');
    acceptMutation.mutate();
  };

  const handleRegisterAndAccept = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    registerAndAcceptMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Einladung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (inviteError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Einladung ungültig
          </h2>
          <p className="text-gray-600 mb-6">
            Diese Einladung existiert nicht oder ist abgelaufen.
          </p>
          <Link to="/login" className="btn btn-primary">
            Zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
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
          <h2 className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">
            {organizationName}
          </h2>
          <p className="mt-2 text-lg font-semibold text-primary-600 dark:text-primary-400">
            Einladung zum Team
          </p>
        </div>

        <div className="card">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">{invite.team_name}</h3>
            {invite.team_description && (
              <p className="text-gray-600 mt-2">{invite.team_description}</p>
            )}
            <p className="text-sm text-gray-500 mt-4">
              Eingeladen von <span className="font-medium">{invite.invited_by_name}</span>
            </p>
            <p className="text-sm text-gray-500">
              Rolle: <span className="font-medium capitalize">{invite.role}</span>
            </p>
          </div>

          {invite.expires_at && (
            <div className="flex items-center justify-center text-sm text-gray-600 mb-6">
              <Clock className="w-4 h-4 mr-2" />
              <span>
                Gültig bis: {new Date(invite.expires_at).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {authToken && user ? (
            // User is logged in
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  Angemeldet als <span className="font-medium">{user.name}</span>
                </p>
              </div>
              <button
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>
                  {acceptMutation.isPending ? 'Trete bei...' : 'Team beitreten'}
                </span>
              </button>
              <p className="text-center text-sm text-gray-600">
                Nicht {user.name}?{' '}
                <button
                  onClick={() => {
                    useAuthStore.getState().logout();
                    window.location.reload();
                  }}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Abmelden
                </button>
              </p>
            </div>
          ) : !showRegister ? (
            // User not logged in - show login/register options
            <div className="space-y-4">
              <button
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                className="btn btn-primary w-full"
              >
                Mit bestehendem Account beitreten
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">oder</span>
                </div>
              </div>
              <button
                onClick={() => setShowRegister(true)}
                className="btn btn-secondary w-full"
              >
                Neuen Account erstellen
              </button>
              <p className="text-center text-sm text-gray-600">
                Bereits einen Account?{' '}
                <Link to={`/login?redirect=/invite/${token}`} className="font-medium text-primary-600 hover:text-primary-500">
                  Jetzt anmelden
                </Link>
              </p>
            </div>
          ) : (
            // Registration form
            <form onSubmit={handleRegisterAndAccept} className="space-y-4">
              {invite.player_name ? (
                // Player invite - show predefined name
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Registrierung für:</span> {invite.player_name}
                  </p>
                  {invite.player_birth_date && (
                    <p className="text-sm text-blue-800 mt-1">
                      <span className="font-medium">Geburtsdatum:</span>{' '}
                      {new Date(invite.player_birth_date).toLocaleDateString('de-DE')}
                    </p>
                  )}
                  {invite.player_jersey_number && (
                    <p className="text-sm text-blue-800 mt-1">
                      <span className="font-medium">Trikotnummer:</span> {invite.player_jersey_number}
                    </p>
                  )}
                </div>
              ) : (
                // Regular invite - require name input
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name *
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
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-Mail *
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Passwort *
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

              <button
                type="submit"
                disabled={registerAndAcceptMutation.isPending}
                className="btn btn-primary w-full"
              >
                {registerAndAcceptMutation.isPending ? 'Registriert...' : 'Registrieren & Beitreten'}
              </button>

              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="btn btn-secondary w-full"
              >
                Zurück
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
