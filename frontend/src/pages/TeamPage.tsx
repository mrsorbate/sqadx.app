import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { teamsAPI, invitesAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Calendar, Users, BarChart, ArrowLeft, UserPlus, X, Copy, Check, Clock, Mail, Phone, Upload, Image as ImageIcon } from 'lucide-react';
import InviteManager from '../components/InviteManager';
import { useToast } from '../lib/useToast';

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id!);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [showCreatePlayer, setShowCreatePlayer] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerBirthDate, setPlayerBirthDate] = useState('');
  const [playerJerseyNumber, setPlayerJerseyNumber] = useState('');
  const [createdPlayerInfo, setCreatedPlayerInfo] = useState<{ name: string; invite_url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadingTeamPicture, setUploadingTeamPicture] = useState(false);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const response = await teamsAPI.getById(teamId);
      return response.data;
    },
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const response = await teamsAPI.getMembers(teamId);
      return response.data;
    },
  });

  const isTrainer = members?.find((m: any) => m.id === user?.id)?.role === 'trainer';
  const isAdmin = user?.role === 'admin';

  const { data: invites } = useQuery({
    queryKey: ['team-invites', teamId],
    queryFn: async () => {
      const response = await invitesAPI.getTeamInvites(teamId);
      return response.data;
    },
    enabled: (isTrainer || isAdmin) && !!members, // Only load if user is trainer/admin and members are loaded
  });

  const createPlayerMutation = useMutation({
    mutationFn: (data: { name: string; birth_date?: string; jersey_number?: number }) =>
      teamsAPI.createPlayer(teamId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] });
      setCreatedPlayerInfo({
        name: response.data.name,
        invite_url: response.data.invite_url,
      });
      setPlayerName('');
      setPlayerBirthDate('');
      setPlayerJerseyNumber('');
    },
  });

  const uploadTeamPictureMutation = useMutation({
    mutationFn: (file: File) => teamsAPI.uploadTeamPicture(teamId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setUploadingTeamPicture(false);
      showToast('Mannschaftsbild erfolgreich hochgeladen', 'success');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      showToast('Fehler beim Hochladen des Bildes', 'error');
      setUploadingTeamPicture(false);
    },
  });

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    createPlayerMutation.mutate({
      name: playerName,
      birth_date: playerBirthDate || undefined,
      jersey_number: playerJerseyNumber ? parseInt(playerJerseyNumber) : undefined,
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      showToast('Nur Bilddateien (JPEG, PNG, GIF, WEBP) sind erlaubt', 'warning');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Die Datei ist zu groß. Maximale Größe: 5MB', 'warning');
      return;
    }

    setUploadingTeamPicture(true);
    uploadTeamPictureMutation.mutate(file);
  };

  const getTeamPhotoUrl = (): string | undefined => {
    if (team?.team_picture) {
      return `http://localhost:3001${team.team_picture}`;
    }
    return undefined;
  };

  const handleCloseModal = () => {
    setShowCreatePlayer(false);
    setCreatedPlayerInfo(null);
    setPlayerName('');
    setPlayerBirthDate('');
    setPlayerJerseyNumber('');
    setCopied(false);
  };

  const handleCopyLink = () => {
    if (createdPlayerInfo?.invite_url) {
      navigator.clipboard.writeText(createdPlayerInfo.invite_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Einladungslink wurde in die Zwischenablage kopiert', 'info');
    }
  };

  if (teamLoading || membersLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  const trainers = members?.filter((m: any) => m.role === 'trainer') || [];
  const players = members?.filter((m: any) => m.role === 'player') || [];
  
  // Filter player invites that are still pending (not used or not fully used)
  const pendingPlayerInvites = invites?.filter((inv: any) => 
    inv.player_name && // Only player invites (not generic invites)
    (!inv.max_uses || inv.used_count < inv.max_uses) // Not fully used
  ) || [];
  
  const totalPlayers = players.length + pendingPlayerInvites.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        <Link to="/" className="mt-1 sm:mt-0 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">{team?.name}</h1>
          {team?.description && (
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 break-words">{team.description}</p>
          )}
        </div>
      </div>

      {/* Team Photo Upload (Trainer only) */}
      {isTrainer && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-primary-600" />
            Mannschaftsbild
          </h2>
          {getTeamPhotoUrl() ? (
            <div className="relative w-full">
              <img
                src={getTeamPhotoUrl()}
                alt={team?.name}
                className="w-full h-64 object-cover rounded-lg shadow-lg"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingTeamPicture}
                className="absolute bottom-3 right-3 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                title="Neues Bild hochladen"
              >
                <Upload className="w-5 h-5 text-gray-700 dark:text-gray-100" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-100">Ändern</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingTeamPicture}
              className="w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-800/70 transition-colors disabled:opacity-50"
            >
              <ImageIcon className="w-16 h-16 text-gray-400 mb-3" />
              <span className="text-base text-gray-600 dark:text-gray-300 font-medium">
                {uploadingTeamPicture ? 'Lädt...' : 'Mannschaftsbild hochladen'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                JPEG, PNG, GIF oder WEBP (max. 5MB)
              </span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Link
          to={`/teams/${teamId}/events`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-3 sm:space-x-4"
        >
          <div className="bg-primary-100 p-3 rounded-lg">
            <Calendar className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Termine</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Trainings & Spiele</p>
          </div>
        </Link>

        <button className="card hover:shadow-md transition-shadow flex items-center space-x-3 sm:space-x-4 text-left">
          <div className="bg-green-100 p-3 rounded-lg">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Kader</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{players.length} Spieler</p>
          </div>
        </button>

        <Link
          to={`/teams/${teamId}/stats`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-3 sm:space-x-4"
        >
          <div className="bg-blue-100 p-3 rounded-lg">
            <BarChart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Statistiken</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Anwesenheit</p>
          </div>
        </Link>
      </div>

      {/* Invite Manager - für Trainer und Admin */}
      {(isTrainer || isAdmin) && (
        <InviteManager teamId={teamId} teamName={team?.name || ''} />
      )}

      {/* Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trainers */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
            <span className="mr-2">👨‍🏫</span>
            Trainer
            <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
              {trainers.length}
            </span>
          </h2>
          <div className="space-y-2">
            {trainers.map((trainer: any) => (
              <div
                key={trainer.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-semibold">
                    {trainer.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{trainer.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {trainer.email}
                  </p>
                  {trainer.phone_number && (
                    <a
                      href={`tel:${trainer.phone_number}`}
                      className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {trainer.phone_number}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <span className="mr-2">⚽</span>
              Spieler ({totalPlayers})
            </h2>
            {isTrainer && (
              <button
                onClick={() => setShowCreatePlayer(true)}
                className="btn btn-primary flex items-center justify-center space-x-2 text-sm w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Spieler anlegen</span>
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {/* Registered Players */}
            {players.map((player: any) => (
              <div
                key={player.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    {player.jersey_number ? (
                      <span className="text-green-600 font-semibold">
                        {player.jersey_number}
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold">
                        {player.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                    {player.birth_date && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        🎂 {new Date(player.birth_date).toLocaleDateString('de-DE')}
                      </p>
                    )}
                    {player.position && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{player.position}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Pending Player Invites */}
            {pendingPlayerInvites.map((invite: any) => (
              <div
                key={`invite-${invite.id}`}
                className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between dark:bg-yellow-900/20 dark:border-yellow-800"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    {invite.player_jersey_number ? (
                      <span className="text-yellow-600 font-semibold">
                        {invite.player_jersey_number}
                      </span>
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{invite.player_name}</p>
                    {invite.player_birth_date && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        🎂 {new Date(invite.player_birth_date).toLocaleDateString('de-DE')}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                        <Mail className="w-3 h-3 mr-1" />
                        Eingeladen
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {players.length === 0 && pendingPlayerInvites.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p>Noch keine Spieler im Team</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Player Modal */}
      {showCreatePlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Neuen Spieler anlegen</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {createdPlayerInfo ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200 font-semibold mb-2">
                    ✅ {createdPlayerInfo.name} wurde erfolgreich angelegt!
                  </p>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Der Spieler wurde eingeladen und kann sich mit dem untenstehenden Link registrieren.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
                    📩 Einladungslink für {createdPlayerInfo.name}
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={createdPlayerInfo.invite_url}
                      readOnly
                      className="input text-sm flex-1"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="btn btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Kopieren</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    ⚠️ Teile diesen Link mit dem Spieler. Er kann sich damit registrieren und wird automatisch dem Team hinzugefügt.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="btn btn-primary w-full"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreatePlayer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="input"
                    placeholder="z.B. Max Mustermann"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Geburtsdatum
                  </label>
                  <input
                    type="date"
                    value={playerBirthDate}
                    onChange={(e) => setPlayerBirthDate(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trikotnummer (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerJerseyNumber}
                    onChange={(e) => setPlayerJerseyNumber(e.target.value)}
                    className="input"
                    placeholder="z.B. 10"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 Es wird automatisch ein Account mit E-Mail und Passwort erstellt.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={createPlayerMutation.isPending}
                    className="btn btn-primary w-full sm:flex-1"
                  >
                    {createPlayerMutation.isPending ? 'Wird erstellt...' : 'Spieler anlegen'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn-secondary w-full sm:w-auto"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
