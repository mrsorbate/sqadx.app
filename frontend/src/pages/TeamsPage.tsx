import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Users, Calendar, BarChart, Upload, Image as ImageIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { useToast } from '../lib/useToast';

export default function TeamsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [uploadingTeamId, setUploadingTeamId] = useState<number | null>(null);
  const { showToast } = useToast();
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await teamsAPI.getAll();
      return response.data;
    },
  });

  // Mutation for team photo upload
  const uploadTeamPictureMutation = useMutation({
    mutationFn: ({ teamId, file }: { teamId: number; file: File }) =>
      teamsAPI.uploadTeamPicture(teamId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setUploadingTeamId(null);
      showToast('Mannschaftsbild erfolgreich hochgeladen', 'success');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      showToast('Fehler beim Hochladen des Bildes', 'error');
      setUploadingTeamId(null);
    },
  });

  const handleFileSelect = (teamId: number, event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingTeamId(teamId);
    uploadTeamPictureMutation.mutate({ teamId, file });
  };

  const getTeamPhotoUrl = (team: any): string | undefined => {
    if (team.team_picture) {
      return `http://localhost:3001${team.team_picture}`;
    }
    return undefined;
  };

  if (isLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  // Wenn Trainer nur 1 Team hat, direkt zu diesem Team navigieren
  if (user?.role === 'trainer' && teams?.length === 1) {
    return <Navigate to={`/teams/${teams[0].id}`} replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Meine Teams</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">Verwalte deine Teams und bleibe über Aktivitäten auf dem Laufenden</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {teams?.map((team: any) => (
          <div key={team.id} className="card hover:shadow-md transition-shadow">
            {/* Team Photo Section (Trainer only) */}
            {team.my_role === 'trainer' && (
              <div className="mb-4">
                {getTeamPhotoUrl(team) ? (
                  <div className="relative">
                    <img
                      src={getTeamPhotoUrl(team)}
                      alt={team.name}
                      className="w-full h-40 sm:h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRefs.current[team.id]?.click();
                      }}
                      disabled={uploadingTeamId === team.id}
                      className="absolute bottom-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                      title="Neues Bild hochladen"
                    >
                      <Upload className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRefs.current[team.id]?.click();
                    }}
                    disabled={uploadingTeamId === team.id}
                    className="w-full h-40 sm:h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
                  >
                    <ImageIcon className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {uploadingTeamId === team.id ? 'Lädt...' : 'Mannschaftsbild hochladen'}
                    </span>
                  </button>
                )}
                <input
                  ref={(el) => (fileInputRefs.current[team.id] = el)}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={(e) => handleFileSelect(team.id, e)}
                  className="hidden"
                />
              </div>
            )}

            <Link to={`/teams/${team.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {team.my_role === 'trainer' ? '👨‍🏫 Trainer' : '⚽ Spieler'}
                  </p>
                  {team.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{team.description}</p>
                  )}
                </div>
                <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 sm:gap-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Termine</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <BarChart className="w-4 h-4 mr-1" />
                  <span>Statistiken</span>
                </div>
              </div>
            </Link>
          </div>
        ))}

        {teams?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">Noch keine Teams</p>
            <p className="text-sm mt-2">
              Warte darauf, zu einem Team eingeladen zu werden oder kontaktiere einen Administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
