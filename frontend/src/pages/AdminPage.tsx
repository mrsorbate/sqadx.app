import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, Users, UserPlus, Shield, Settings, Upload } from 'lucide-react';
import InviteManager from '../components/InviteManager';

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

export default function AdminPage() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  
  const [showOrganizationSettings, setShowOrganizationSettings] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Berlin');
  
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showAssignTrainer, setShowAssignTrainer] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [memberRole, setMemberRole] = useState('player');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('');
  const [expandedInviteTeamId, setExpandedInviteTeamId] = useState<number | null>(null);
  const [showDeleteOrganizationConfirm, setShowDeleteOrganizationConfirm] = useState(false);
  const [deleteOrganizationConfirmText, setDeleteOrganizationConfirmText] = useState('');
  const [showCreateTrainer, setShowCreateTrainer] = useState(false);
  const [trainerName, setTrainerName] = useState('');
  const [trainerUsername, setTrainerUsername] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerPassword, setTrainerPassword] = useState('');

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await adminAPI.getSettings();
      setOrganizationName(response.data.name || '');
      setTimezone(response.data.timezone || 'Europe/Berlin');
      return response.data;
    },
  });

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const response = await adminAPI.getAllTeams();
      return response.data;
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await adminAPI.getAllUsers();
      return response.data;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: { organizationName: string; timezone: string }) =>
      adminAPI.updateSettings(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      setShowOrganizationSettings(false);
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => adminAPI.uploadLogo(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      // Reset file input
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      console.error('Logo upload error:', error);
      alert('Logo-Upload fehlgeschlagen: ' + (error.response?.data?.error || error.message));
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => adminAPI.createTeam(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      await queryClient.refetchQueries({ queryKey: ['admin-teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreateTeam(false);
      setTeamName('');
      setTeamDescription('');
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: number) => adminAPI.deleteTeam(teamId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      await queryClient.refetchQueries({ queryKey: ['admin-teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { teamId: number; userId: number; role: string; jerseyNumber?: number; position?: string }) =>
      adminAPI.addUserToTeam(data.teamId, {
        user_id: data.userId,
        role: data.role,
        jersey_number: data.jerseyNumber,
        position: data.position,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      await queryClient.refetchQueries({ queryKey: ['admin-teams'] });
      setShowAssignTrainer(false);
      setShowAddPlayer(false);
      setSelectedTrainer('');
      setSelectedPlayer('');
      setMemberRole('player');
      setJerseyNumber('');
      setPosition('');
    },
  });

  const deleteOrganizationMutation = useMutation({
    mutationFn: () => adminAPI.deleteOrganization(),
    onSuccess: () => {
      logout();
      window.location.href = '/';
    },
  });

  const createTrainerMutation = useMutation({
    mutationFn: (data: { name: string; username: string; email: string; password: string }) =>
      adminAPI.createTrainer(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      setShowCreateTrainer(false);
      setTrainerName('');
      setTrainerUsername('');
      setTrainerEmail('');
      setTrainerPassword('');
    },
  });

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ organizationName, timezone });
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        alert('Datei ist zu groß. Maximale Größe: 5MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Ungültiger Dateityp. Erlaubt: JPG, PNG, GIF, WebP');
        return;
      }
      
      uploadLogoMutation.mutate(file);
    }
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    createTeamMutation.mutate({ name: teamName, description: teamDescription });
  };

  const handleAssignTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeam && selectedTrainer) {
      addMemberMutation.mutate({
        teamId: selectedTeam,
        userId: parseInt(selectedTrainer),
        role: 'trainer',
      });
    }
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeam && selectedPlayer) {
      addMemberMutation.mutate({
        teamId: selectedTeam,
        userId: parseInt(selectedPlayer),
        role: memberRole,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined,
        position: position || undefined,
      });
    }
  };

  const handleCreateTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    createTrainerMutation.mutate({
      name: trainerName,
      username: trainerUsername.trim().toLowerCase(),
      email: trainerEmail,
      password: trainerPassword,
    });
  };

  if (teamsLoading || usersLoading || settingsLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  const API_URL = import.meta.env.VITE_API_URL || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin-Panel</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Team- und Benutzerverwaltung</p>
          </div>
        </div>
      </div>

      {/* Organization Settings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Settings className="w-6 h-6 mr-2 text-primary-600" />
            Vereins-Einstellungen
          </h2>
          <button
            onClick={() => setShowOrganizationSettings(!showOrganizationSettings)}
            className="btn btn-secondary text-sm"
          >
            {showOrganizationSettings ? 'Abbrechen' : 'Bearbeiten'}
          </button>
        </div>

        {showOrganizationSettings ? (
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vereinsname
              </label>
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="input"
                placeholder="z.B. SV Musterdorf"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zeitzone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="input"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="btn btn-primary"
            >
              {updateSettingsMutation.isPending ? 'Speichert...' : 'Speichern'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              {settings?.logo && (
                <div className="flex-shrink-0">
                  <img
                    src={`${API_URL}${settings.logo}`}
                    alt="Vereinslogo"
                    className="w-24 h-24 rounded-lg object-contain bg-white border-2 border-gray-200 dark:border-gray-700 p-2"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Vereinsname:</span>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{settings?.name || 'Nicht festgelegt'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Zeitzone:</span>
                  <p className="text-gray-900 dark:text-white">{settings?.timezone || 'Europe/Berlin'}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vereinslogo {settings?.logo ? 'ändern' : 'hochladen'}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Erlaubt: JPG, PNG, GIF, WebP (max. 5MB)
              </p>
              <input
                type="file"
                ref={logoFileInputRef}
                onChange={handleLogoFileSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => logoFileInputRef.current?.click()}
                disabled={uploadLogoMutation.isPending}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadLogoMutation.isPending ? 'Lädt hoch...' : settings?.logo ? 'Logo ändern' : 'Logo hochladen'}</span>
              </button>
              {uploadLogoMutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Upload fehlgeschlagen. Bitte versuche es erneut.
                </p>
              )}
              {uploadLogoMutation.isSuccess && !uploadLogoMutation.isPending && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  ✓ Logo erfolgreich hochgeladen!
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Workflow:</strong> Erstelle Teams → Weise Trainer zu → Trainer fügen Spieler hinzu. Der Admin ist Manager und nicht Teil der Teams.
        </p>
      </div>

      {showCreateTeam && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Neues Team erstellen</h3>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Team Name *
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="input mt-1"
                placeholder="z.B. FC Musterhausen U19"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Beschreibung
              </label>
              <textarea
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                className="input mt-1"
                rows={3}
                placeholder="Optionale Beschreibung..."
              />
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary" disabled={createTeamMutation.isPending}>
                {createTeamMutation.isPending ? 'Erstellt...' : 'Team erstellen'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateTeam(false)}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teams Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Users className="w-6 h-6 mr-2 text-primary-600" />
            Alle Teams ({teams?.length || 0})
          </h2>
          <button
            onClick={() => setShowCreateTeam(!showCreateTeam)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Team erstellen</span>
          </button>
        </div>
        
        <div className="space-y-3">
          {teams?.map((team: any) => (
            <div key={team.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>👥 {team.member_count} Mitglieder</span>
                    <span>Erstellt von: {team.created_by_name}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      setExpandedInviteTeamId(expandedInviteTeamId === team.id ? null : team.id)
                    }
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Trainer einladen"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTeam(team.id);
                      setShowAssignTrainer(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Trainer zuweisen"
                  >
                    <Shield className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTeam(team.id);
                      setShowAddPlayer(true);
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Spieler hinzufügen"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Team "${team.name}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) {
                        deleteTeamMutation.mutate(team.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Team löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {expandedInviteTeamId === team.id && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <InviteManager teamId={team.id} teamName={team.name} />
                </div>
              )}
            </div>
          ))}

          {teams?.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Noch keine Teams erstellt</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Trainer Modal */}
      {showAssignTrainer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Trainer zuweisen
            </h3>
            <form onSubmit={handleAssignTrainer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trainer auswählen *
                </label>
                <select
                  required
                  value={selectedTrainer}
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                  className="input"
                >
                  <option value="">-- Trainer wählen --</option>
                  {users?.filter((u: any) => u.role === 'trainer').map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary" disabled={addMemberMutation.isPending}>
                  {addMemberMutation.isPending ? 'Weist zu...' : 'Zuweisen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignTrainer(false);
                    setSelectedTrainer('');
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-green-600" />
              Spieler hinzufügen
            </h3>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benutzer auswählen *
                </label>
                <select
                  required
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="input"
                >
                  <option value="">-- Benutzer wählen --</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rolle *
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="input"
                >
                  <option value="player">Spieler</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {memberRole === 'player' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Trikotnummer
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(e.target.value)}
                      className="input"
                      placeholder="z.B. 10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="input"
                      placeholder="z.B. Stürmer, Mittelfeld"
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary" disabled={addMemberMutation.isPending}>
                  {addMemberMutation.isPending ? 'Fügt hinzu...' : 'Hinzufügen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPlayer(false);
                    setSelectedPlayer('');
                    setMemberRole('player');
                    setJerseyNumber('');
                    setPosition('');
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Alle Benutzer ({users?.length || 0})</h2>
          <button
            onClick={() => setShowCreateTrainer(!showCreateTrainer)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Trainer erstellen</span>
          </button>
        </div>

        {showCreateTrainer && (
          <form onSubmit={handleCreateTrainer} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Neuen Trainer anlegen</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                required
                value={trainerName}
                onChange={(e) => setTrainerName(e.target.value)}
                className="input"
                placeholder="z.B. Max Trainer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benutzername *</label>
              <input
                type="text"
                required
                value={trainerUsername}
                onChange={(e) => setTrainerUsername(e.target.value)}
                className="input"
                placeholder="max_trainer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail *</label>
              <input
                type="email"
                required
                value={trainerEmail}
                onChange={(e) => setTrainerEmail(e.target.value)}
                className="input"
                placeholder="trainer@verein.de"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passwort *</label>
              <input
                type="password"
                required
                minLength={6}
                value={trainerPassword}
                onChange={(e) => setTrainerPassword(e.target.value)}
                className="input"
                placeholder="Mindestens 6 Zeichen"
              />
            </div>

            {createTrainerMutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {(createTrainerMutation.error as any)?.response?.data?.error || 'Trainer konnte nicht erstellt werden'}
              </p>
            )}

            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary" disabled={createTrainerMutation.isPending}>
                {createTrainerMutation.isPending ? 'Erstellt...' : 'Trainer erstellen'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateTrainer(false)}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rolle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Teams
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'trainer'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'trainer' ? 'Trainer' : 'Spieler'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.team_count} Team{user.team_count !== 1 ? 's' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-2 border-red-200 dark:border-red-900">
        <h2 className="text-xl font-semibold mb-2 text-red-700 dark:text-red-400">Gefahrenzone</h2>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          Verein löschen entfernt alle Teams, Benutzer, Einladungen, Termine und Uploads endgültig.
        </p>

        {!showDeleteOrganizationConfirm ? (
          <button
            onClick={() => setShowDeleteOrganizationConfirm(true)}
            className="btn bg-red-600 hover:bg-red-700 text-white"
          >
            Verein löschen
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Gib zur Bestätigung den Vereinsnamen ein: <strong>{settings?.name || 'Unbekannt'}</strong>
            </p>
            <input
              type="text"
              value={deleteOrganizationConfirmText}
              onChange={(e) => setDeleteOrganizationConfirmText(e.target.value)}
              className="input"
              placeholder="Vereinsname eingeben"
            />
            <div className="flex gap-3">
              <button
                onClick={() => deleteOrganizationMutation.mutate()}
                disabled={
                  deleteOrganizationMutation.isPending ||
                  deleteOrganizationConfirmText.trim() !== (settings?.name || '')
                }
                className="btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteOrganizationMutation.isPending ? 'Löscht...' : 'Jetzt endgültig löschen'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteOrganizationConfirm(false);
                  setDeleteOrganizationConfirmText('');
                }}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
            </div>
            {deleteOrganizationMutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Löschen fehlgeschlagen. Bitte erneut versuchen.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
