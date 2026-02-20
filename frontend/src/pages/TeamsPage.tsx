import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Users, Calendar, BarChart, Upload, Image as ImageIcon } from 'lucide-react';
import { useState, useRef } from 'react';

export default function TeamsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [uploadingTeamId, setUploadingTeamId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

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
      showToast('Nur Bilddateien (JPEG, PNG, GIF, WEBP) sind erlaubt', 'error');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Die Datei ist zu groß. Maximale Größe: 5MB', 'error');
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
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meine Teams</h1>
          <p className="text-gray-600 mt-1">Verwalte deine Teams und bleibe über Aktivitäten auf dem Laufenden</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRefs.current[team.id]?.click();
                      }}
                      disabled={uploadingTeamId === team.id}
                      className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                      title="Neues Bild hochladen"
                    >
                      <Upload className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRefs.current[team.id]?.click();
                    }}
                    disabled={uploadingTeamId === team.id}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
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
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {team.my_role === 'trainer' ? '👨‍🏫 Trainer' : '⚽ Spieler'}
                  </p>
                  {team.description && (
                    <p className="text-sm text-gray-500 mt-2">{team.description}</p>
                  )}
                </div>
                <Users className="w-6 h-6 text-gray-400" />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Termine</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <BarChart className="w-4 h-4 mr-1" />
                  <span>Statistiken</span>
                </div>
              </div>
            </Link>
          </div>
        ))}

        {teams?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
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
