import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Calendar, Users, BarChart, ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../lib/useToast';
import { resolveAssetUrl } from '../lib/utils';

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id!);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

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

  const uploadTeamPictureMutation = useMutation({
    mutationFn: (file: File) => teamsAPI.uploadTeamPicture(teamId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setUploadingTeamPicture(false);
      showToast('Mannschaftsbild erfolgreich hochgeladen', 'success');
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      showToast(error?.response?.data?.error || 'Fehler beim Hochladen des Bildes', 'error');
      setUploadingTeamPicture(false);
    },
  });

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
    return resolveAssetUrl(team?.team_picture);
  };

  if (teamLoading || membersLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  const trainers = members?.filter((m: any) => m.role === 'trainer') || [];
  const players = members?.filter((m: any) => m.role === 'player') || [];

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
        <div className="card p-0 overflow-hidden">
          {getTeamPhotoUrl() ? (
            <div className="relative w-full min-h-[20rem] sm:min-h-[24rem]">
              <img
                src={getTeamPhotoUrl()}
                alt={team?.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <h3 className="inline-block px-3 py-1 rounded-md bg-black/55 text-white text-xl font-bold backdrop-blur-sm">
                  {team?.name}
                </h3>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingTeamPicture}
                className="absolute bottom-3 right-3 z-30 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
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
              className="w-full h-72 sm:h-96 border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-800/70 transition-colors disabled:opacity-50"
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

        <Link
          to={`/teams/${teamId}/kader`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-3 sm:space-x-4 text-left"
        >
          <div className="bg-green-100 p-3 rounded-lg">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Trainer &amp; Spieler</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{trainers.length} Trainer • {players.length} Spieler</p>
          </div>
        </Link>

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

    </div>
  );
}
