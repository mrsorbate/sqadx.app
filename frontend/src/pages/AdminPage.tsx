import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, Users, UserPlus, UserMinus, Shield, Settings, Upload, Copy, Share2, Check, KeyRound } from 'lucide-react';

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
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [showOrganizationSettings, setShowOrganizationSettings] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Berlin');
  
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [trainerSearch, setTrainerSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [showDeleteTeamConfirmModal, setShowDeleteTeamConfirmModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<any | null>(null);
  
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showAssignTrainer, setShowAssignTrainer] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [showRemoveTrainer, setShowRemoveTrainer] = useState(false);
  const [selectedTrainerToRemove, setSelectedTrainerToRemove] = useState('');
  const [showDeleteOrganizationConfirm, setShowDeleteOrganizationConfirm] = useState(false);
  const [deleteOrganizationConfirmText, setDeleteOrganizationConfirmText] = useState('');
  const [showCreateTrainer, setShowCreateTrainer] = useState(false);
  const [trainerName, setTrainerName] = useState('');
  const [trainerTeamIds, setTrainerTeamIds] = useState<number[]>([]);
  const [trainerInviteLink, setTrainerInviteLink] = useState('');
  const [copiedTrainerLink, setCopiedTrainerLink] = useState(false);
  const [showResendTrainerLinkModal, setShowResendTrainerLinkModal] = useState(false);
  const [resendTrainerName, setResendTrainerName] = useState('');
  const [resendTrainerLink, setResendTrainerLink] = useState('');
  const [copiedResendTrainerLink, setCopiedResendTrainerLink] = useState(false);
  const [showDeleteUserConfirmModal, setShowDeleteUserConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [showResetPasswordConfirmModal, setShowResetPasswordConfirmModal] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<any | null>(null);
  const [showGeneratedPasswordModal, setShowGeneratedPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedGeneratedPassword, setCopiedGeneratedPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

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

  const { data: teamTrainers } = useQuery({
    queryKey: ['admin-team-trainers', selectedTeam],
    queryFn: async () => {
      if (!selectedTeam) return [];
      const response = await adminAPI.getTeamTrainers(selectedTeam);
      return response.data;
    },
    enabled: (showAssignTrainer || showRemoveTrainer) && !!selectedTeam,
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
      showToast('Logo-Upload fehlgeschlagen: ' + (error.response?.data?.error || error.message), 'error');
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

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => adminAPI.deleteUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      await queryClient.refetchQueries({ queryKey: ['admin-teams'] });
      await queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const resendTrainerInviteMutation = useMutation({
    mutationFn: (userId: number) => adminAPI.resendTrainerInvite(userId),
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: (userId: number) => adminAPI.resetUserPassword(userId),
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { teamId: number; userId: number; role: string }) =>
      adminAPI.addUserToTeam(data.teamId, {
        user_id: data.userId,
        role: data.role,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      await queryClient.refetchQueries({ queryKey: ['admin-teams'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      if (selectedTeam) {
        await queryClient.invalidateQueries({ queryKey: ['admin-team-trainers', selectedTeam] });
        await queryClient.refetchQueries({ queryKey: ['admin-team-trainers', selectedTeam] });
      }
      setShowAssignTrainer(false);
      setSelectedTrainer('');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (data: { teamId: number; userId: number }) =>
      adminAPI.removeUserFromTeam(data.teamId, data.userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      await queryClient.refetchQueries({ queryKey: ['admin-teams'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      if (selectedTeam) {
        await queryClient.invalidateQueries({ queryKey: ['admin-team-trainers', selectedTeam] });
        await queryClient.refetchQueries({ queryKey: ['admin-team-trainers', selectedTeam] });
      }
      setShowRemoveTrainer(false);
      setSelectedTrainerToRemove('');
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
    mutationFn: (data: { name: string; teamIds: number[]; expiresInDays?: number }) =>
      adminAPI.createTrainerInvite(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      await queryClient.refetchQueries({ queryKey: ['admin-teams'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
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
        showToast('Datei ist zu groß. Maximale Größe: 5MB', 'error');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Ungültiger Dateityp. Erlaubt: JPG, PNG, GIF, WebP', 'error');
        return;
      }
      
      uploadLogoMutation.mutate(file);
    }
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    createTeamMutation.mutate({ name: teamName, description: teamDescription });
  };

  const handleDeleteTeam = (teamItem: any) => {
    setTeamToDelete(teamItem);
    setShowDeleteTeamConfirmModal(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      await deleteTeamMutation.mutateAsync(teamToDelete.id);
      setShowDeleteTeamConfirmModal(false);
      setTeamToDelete(null);
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Team konnte nicht gelöscht werden', 'error');
    }
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

  const handleCreateTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    setTrainerInviteLink('');
    setCopiedTrainerLink(false);
    createTrainerMutation.mutate({
      name: trainerName,
      teamIds: trainerTeamIds,
      expiresInDays: 7,
    }, {
      onSuccess: (response: any) => {
        setTrainerInviteLink(response.data.invite_url || '');
      }
    });
  };

  const handleRemoveTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeam && selectedTrainerToRemove) {
      removeMemberMutation.mutate({
        teamId: selectedTeam,
        userId: parseInt(selectedTrainerToRemove),
      });
    }
  };

  const toggleTrainerTeam = (teamId: number) => {
    setTrainerTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleCopyTrainerLink = async () => {
    if (!trainerInviteLink) return;
    await navigator.clipboard.writeText(trainerInviteLink);
    setCopiedTrainerLink(true);
    setTimeout(() => setCopiedTrainerLink(false), 2000);
  };

  const handleShareTrainerLink = async () => {
    if (!trainerInviteLink) return;
    if ((navigator as any).share) {
      await (navigator as any).share({
        title: 'Trainer-Registrierung',
        text: `Einladungslink für Trainer ${trainerName}`,
        url: trainerInviteLink,
      });
      return;
    }
    await handleCopyTrainerLink();
  };

  const closeCreateTrainerModal = () => {
    setShowCreateTrainer(false);
    setTrainerName('');
    setTrainerTeamIds([]);
    setTrainerInviteLink('');
    setCopiedTrainerLink(false);
  };

  const handleDeleteUser = (userItem: any) => {
    setUserToDelete(userItem);
    setShowDeleteUserConfirmModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      setShowDeleteUserConfirmModal(false);
      setUserToDelete(null);
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Benutzer konnte nicht gelöscht werden', 'error');
    }
  };

  const handleResendTrainerInvite = async (userItem: any) => {
    try {
      const response = await resendTrainerInviteMutation.mutateAsync(userItem.id);
      const inviteUrl = response?.data?.invite_url;

      if (!inviteUrl) {
        showToast('Einladungslink konnte nicht erstellt werden.', 'error');
        return;
      }

      setResendTrainerName(userItem.name || 'Trainer');
      setResendTrainerLink(inviteUrl);
      setCopiedResendTrainerLink(false);
      setShowResendTrainerLinkModal(true);
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Link konnte nicht neu versendet werden', 'error');
    }
  };

  const handleCopyResendTrainerLink = async () => {
    if (!resendTrainerLink) return;
    await navigator.clipboard.writeText(resendTrainerLink);
    setCopiedResendTrainerLink(true);
    setTimeout(() => setCopiedResendTrainerLink(false), 2000);
  };

  const handleShareResendTrainerLink = async () => {
    if (!resendTrainerLink) return;
    if ((navigator as any).share) {
      await (navigator as any).share({
        title: 'Trainer-Registrierung',
        text: `Einladungslink für Trainer ${resendTrainerName}`,
        url: resendTrainerLink,
      });
      return;
    }
    await handleCopyResendTrainerLink();
  };

  const handleResetUserPassword = async (userItem: any) => {
    setUserToResetPassword(userItem);
    setShowResetPasswordConfirmModal(true);
  };

  const confirmResetUserPassword = async () => {
    if (!userToResetPassword) return;

    try {
      const response = await resetUserPasswordMutation.mutateAsync(userToResetPassword.id);
      const generatedPassword = response?.data?.generatedPassword;

      if (!generatedPassword) {
        showToast('Passwort wurde zurückgesetzt, aber kein neues Passwort zurückgegeben.', 'error');
        return;
      }

      setShowResetPasswordConfirmModal(false);
      setUserToResetPassword(null);
      setGeneratedPassword(generatedPassword);
      setCopiedGeneratedPassword(false);
      setShowGeneratedPasswordModal(true);
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Passwort konnte nicht zurückgesetzt werden', 'error');
    }
  };

  const handleCopyGeneratedPassword = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopiedGeneratedPassword(true);
    setTimeout(() => setCopiedGeneratedPassword(false), 2000);
  };

  if (teamsLoading || usersLoading || settingsLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  const API_URL = import.meta.env.VITE_API_URL || '';
  const trainers = users?.filter((u: any) => u.role === 'trainer') || [];
  const players = users?.filter((u: any) => u.role === 'player') || [];

  const normalizedTeamSearch = teamSearch.trim().toLowerCase();
  const normalizedTrainerSearch = trainerSearch.trim().toLowerCase();
  const normalizedPlayerSearch = playerSearch.trim().toLowerCase();

  const filteredTeams = (teams || []).filter((team: any) => {
    if (!normalizedTeamSearch) return true;
    const haystack = [team.name, team.description, team.trainer_names]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedTeamSearch);
  });

  const filteredTrainers = trainers.filter((trainer: any) => {
    if (!normalizedTrainerSearch) return true;
    const haystack = [trainer.name, trainer.username, trainer.email, trainer.team_names]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedTrainerSearch);
  });

  const filteredPlayers = players.filter((player: any) => {
    if (!normalizedPlayerSearch) return true;
    const haystack = [player.name, player.username, player.email, player.team_names]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedPlayerSearch);
  });

  const formatTrainerOptionLabel = (trainer: any) => {
    const isPending =
      trainer?.registration_status === 'pending' ||
      (typeof trainer?.email === 'string' && trainer.email.endsWith('@pending.local'));

    if (isPending) {
      return `${trainer.name} (Ausstehend)`;
    }

    return `${trainer.name} (${trainer.email})`;
  };

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

        <div className="mb-4">
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            className="input"
            placeholder="Teams durchsuchen..."
          />
        </div>
        
        <div className="space-y-3">
          {filteredTeams.map((team: any) => (
            <div key={team.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>👥 {team.member_count} Mitglieder</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Trainer:</span> {team.trainer_names || '-'}
                  </div>
                </div>
                
                <div className="flex space-x-2">
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
                      setShowRemoveTrainer(true);
                    }}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Trainer entfernen"
                  >
                    <UserMinus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Team löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredTeams.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>{teams?.length ? 'Keine Teams gefunden' : 'Noch keine Teams erstellt'}</p>
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
                  {users?.filter((u: any) => {
                    if (u.role !== 'trainer') return false;
                    const alreadyAssigned = (teamTrainers || []).some((trainer: any) => trainer.id === u.id);
                    return !alreadyAssigned;
                  }).map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {formatTrainerOptionLabel(user)}
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

      {/* Delete Team Confirm Modal */}
      {showDeleteTeamConfirmModal && teamToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Team löschen</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Soll <strong>{teamToDelete.name}</strong> wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteTeamConfirmModal(false);
                  setTeamToDelete(null);
                }}
                className="btn btn-secondary"
                disabled={deleteTeamMutation.isPending}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDeleteTeam}
                className="btn bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteTeamMutation.isPending}
              >
                {deleteTeamMutation.isPending ? 'Löscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Trainer Modal */}
      {showRemoveTrainer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <UserMinus className="w-5 h-5 mr-2 text-orange-600" />
              Trainer entfernen
            </h3>
            <form onSubmit={handleRemoveTrainer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trainer auswählen *
                </label>
                <select
                  required
                  value={selectedTrainerToRemove}
                  onChange={(e) => setSelectedTrainerToRemove(e.target.value)}
                  className="input"
                >
                  <option value="">-- Trainer wählen --</option>
                  {teamTrainers?.map((trainer: any) => (
                    <option key={trainer.id} value={trainer.id}>
                      {formatTrainerOptionLabel(trainer)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary" disabled={removeMemberMutation.isPending || !selectedTrainerToRemove}>
                  {removeMemberMutation.isPending ? 'Entfernt...' : 'Entfernen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveTrainer(false);
                    setSelectedTrainerToRemove('');
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
          <h2 className="text-xl font-semibold">Benutzer ({users?.length || 0})</h2>
          <button
            onClick={() => setShowCreateTrainer(!showCreateTrainer)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Trainer erstellen</span>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-300">Trainer ({trainers.length})</h3>
            <div className="mb-3">
              <input
                type="text"
                value={trainerSearch}
                onChange={(e) => setTrainerSearch(e.target.value)}
                className="input"
                placeholder="Trainer durchsuchen..."
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benutzername</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teams</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTrainers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          {user.registration_status === 'pending' ? 'Wird bei Registrierung gesetzt' : (user.username || '-')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.registration_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {user.registration_status === 'pending' ? 'Ausstehend' : 'Registriert'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {user.registration_status === 'pending' ? '-' : user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.team_names || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {user.registration_status === 'pending' && (
                            <button
                              onClick={() => handleResendTrainerInvite(user)}
                              disabled={resendTrainerInviteMutation.isPending}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Link neu versenden"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleResetUserPassword(user)}
                            disabled={resetUserPasswordMutation.isPending}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Passwort generieren & zurücksetzen"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deleteUserMutation.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Benutzer löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTrainers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-sm text-gray-500">{trainers.length ? 'Keine Trainer gefunden.' : 'Keine Trainer vorhanden.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-300">Spieler ({players.length})</h3>
            <div className="mb-3">
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="input"
                placeholder="Spieler durchsuchen..."
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benutzername</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teams</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPlayers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          {user.registration_status === 'pending' ? 'Wird bei Registrierung gesetzt' : (user.username || '-')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.registration_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {user.registration_status === 'pending' ? 'Ausstehend' : 'Registriert'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.team_names || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleResetUserPassword(user)}
                            disabled={resetUserPasswordMutation.isPending}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Passwort generieren & zurücksetzen"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deleteUserMutation.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Benutzer löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPlayers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-sm text-gray-500">{players.length ? 'Keine Spieler gefunden.' : 'Keine Spieler vorhanden.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Neues Team erstellen</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name *</label>
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
                <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
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
        </div>
      )}

      {/* Create Trainer Modal */}
      {showCreateTrainer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Trainer anlegen & Registrierungslink erstellen</h3>

            <form onSubmit={handleCreateTrainer} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teams zuweisen *</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900">
                  {teams?.map((team: any) => (
                    <label key={team.id} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={trainerTeamIds.includes(team.id)}
                        onChange={() => toggleTrainerTeam(team.id)}
                      />
                      <span>{team.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mindestens ein Team auswählen.</p>
              </div>

              {createTrainerMutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {(createTrainerMutation.error as any)?.response?.data?.error || 'Trainer-Link konnte nicht erstellt werden'}
                </p>
              )}

              {trainerInviteLink && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 space-y-2">
                  <p className="text-sm text-blue-800">Registrierungslink für <strong>{trainerName}</strong>:</p>
                  <input
                    readOnly
                    value={trainerInviteLink}
                    className="input text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleShareTrainerLink}
                      className="btn btn-secondary flex items-center space-x-2"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Link teilen</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyTrainerLink}
                      className="btn btn-secondary flex items-center space-x-2"
                    >
                      {copiedTrainerLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedTrainerLink ? 'Kopiert' : 'Link kopieren'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                {trainerInviteLink ? (
                  <button
                    type="button"
                    onClick={closeCreateTrainerModal}
                    className="btn bg-green-600 hover:bg-green-700 text-white"
                  >
                    Speichern
                  </button>
                ) : (
                  <>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={createTrainerMutation.isPending || !trainerName.trim() || trainerTeamIds.length === 0}
                    >
                      {createTrainerMutation.isPending ? 'Erstellt...' : 'Link erstellen'}
                    </button>
                    <button
                      type="button"
                      onClick={closeCreateTrainerModal}
                      className="btn btn-secondary"
                    >
                      Abbrechen
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Confirm Modal */}
      {showResetPasswordConfirmModal && userToResetPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Passwort zurücksetzen</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Soll das Passwort für <strong>{userToResetPassword.name}</strong> wirklich zurückgesetzt und neu generiert werden?
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowResetPasswordConfirmModal(false);
                  setUserToResetPassword(null);
                }}
                className="btn btn-secondary"
                disabled={resetUserPasswordMutation.isPending}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmResetUserPassword}
                className="btn btn-primary"
                disabled={resetUserPasswordMutation.isPending}
              >
                {resetUserPasswordMutation.isPending ? 'Setzt zurück...' : 'Zurücksetzen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirm Modal */}
      {showDeleteUserConfirmModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Benutzer löschen</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Soll <strong>{userToDelete.name}</strong> wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteUserConfirmModal(false);
                  setUserToDelete(null);
                }}
                className="btn btn-secondary"
                disabled={deleteUserMutation.isPending}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="btn bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? 'Löscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Trainer Link Modal */}
      {showResendTrainerLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Registrierungslink</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Neuer Registrierungslink für <strong>{resendTrainerName}</strong>:
            </p>
            <input
              readOnly
              value={resendTrainerLink}
              className="input mb-4"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleShareResendTrainerLink}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Link teilen</span>
              </button>
              <button
                type="button"
                onClick={handleCopyResendTrainerLink}
                className="btn btn-secondary flex items-center space-x-2"
              >
                {copiedResendTrainerLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedResendTrainerLink ? 'Kopiert' : 'Link kopieren'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResendTrainerLinkModal(false);
                  setResendTrainerName('');
                  setResendTrainerLink('');
                  setCopiedResendTrainerLink(false);
                }}
                className="btn btn-primary"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Password Modal */}
      {showGeneratedPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Neues Passwort</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Das Passwort wurde zurückgesetzt. Teile dieses Passwort sicher mit dem Benutzer.
            </p>
            <input
              readOnly
              value={generatedPassword}
              className="input mb-4"
            />
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCopyGeneratedPassword}
                className="btn btn-secondary flex items-center space-x-2"
              >
                {copiedGeneratedPassword ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedGeneratedPassword ? 'Kopiert' : 'Passwort kopieren'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGeneratedPasswordModal(false);
                  setGeneratedPassword('');
                  setCopiedGeneratedPassword(false);
                }}
                className="btn btn-primary"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[70]">
          <div className={`rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
