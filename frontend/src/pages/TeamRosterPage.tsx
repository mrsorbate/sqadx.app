import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { teamsAPI, invitesAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Clock, Mail, Users } from 'lucide-react';
import { resolveAssetUrl } from '../lib/utils';

export default function TeamRosterPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id!);
  const { user } = useAuthStore();

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
    enabled: (isTrainer || isAdmin) && !!members,
  });

  if (teamLoading || membersLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  const trainers = members?.filter((m: any) => m.role === 'trainer') || [];
  const players = members?.filter((m: any) => m.role === 'player') || [];

  const pendingPlayerInvites = invites?.filter((inv: any) =>
    inv.player_name && (!inv.max_uses || inv.used_count < inv.max_uses)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        <Link
          to={`/teams/${teamId}`}
          className="mt-1 sm:mt-0 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
            Trainer &amp; Spieler - {team?.name}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
            <span className="mr-2">👨‍🏫</span>
            Trainer
            <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
              {trainers.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {trainers.map((trainer: any) => (
              <div
                key={trainer.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center space-x-3"
              >
                {resolveAssetUrl(trainer.profile_picture) ? (
                  <img
                    src={resolveAssetUrl(trainer.profile_picture)}
                    alt={trainer.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">
                      {trainer.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{trainer.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
            <span className="mr-2">⚽</span>
            Spieler
            <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200">
              {players.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {players.map((player: any) => (
              <div
                key={player.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center space-x-3"
              >
                {resolveAssetUrl(player.profile_picture) ? (
                  <img
                    src={resolveAssetUrl(player.profile_picture)}
                    alt={player.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">{player.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                </div>
              </div>
            ))}

            {players.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p>Noch keine registrierten Spieler im Team</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
            <span className="mr-2">📩</span>
            Einladungen &amp; unregistrierte Spieler
            <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
              {pendingPlayerInvites.length}
            </span>
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingPlayerInvites.map((invite: any) => (
              <div
                key={`invite-${invite.id}`}
                className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between dark:bg-yellow-900/20 dark:border-yellow-800"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    {invite.player_jersey_number ? (
                      <span className="text-yellow-600 font-semibold">{invite.player_jersey_number}</span>
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

            {pendingPlayerInvites.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p>Keine offenen Einladungen oder unregistrierten Spieler</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
