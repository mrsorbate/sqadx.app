import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { teamsAPI, invitesAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Clock, Mail, Users, Copy, Trash2, Check } from 'lucide-react';
import { resolveAssetUrl } from '../lib/utils';
import { useToast } from '../lib/useToast';
import { useState } from 'react';

export default function TeamRosterPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id!);
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

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

  const copyLink = async (invite: any) => {
    try {
      const inviteLink = `${window.location.origin}/invite/${invite.token}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopiedId(invite.id);
      showToast('Einladungslink kopiert', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      showToast('Fehler beim Kopieren des Links', 'error');
    }
  };

  const deleteInvite = async (inviteId: number) => {
    if (!confirm('Soll diese Einladung wirklich gelöscht werden?')) return;

    setDeletingId(inviteId);
    try {
      await invitesAPI.deleteInvite(inviteId);
      showToast('Einladung gelöscht', 'success');
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] });
    } catch (err) {
      showToast('Fehler beim Löschen der Einladung', 'error');
    } finally {
      setDeletingId(null);
    }
  };

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
            Spielereinladungen
            <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
              {pendingPlayerInvites.length}
            </span>
          </h2>

          {pendingPlayerInvites.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
              <p>Keine offenen Einladungen oder unregistrierten Spieler</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Gültig bis
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPlayerInvites.map((invite: any) => (
                    <tr
                      key={`invite-${invite.id}`}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        {invite.player_name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                          <Mail className="w-3 h-3 mr-1" />
                          Eingeladen
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {invite.expires_at
                          ? new Date(invite.expires_at).toLocaleDateString('de-DE')
                          : 'Unbegrenzt'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right space-x-2 flex items-center justify-end">
                        <button
                          onClick={() => copyLink(invite)}
                          disabled={deletingId === invite.id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          title="Link kopieren"
                          aria-label={`Einladungslink für ${invite.player_name} kopieren`}
                        >
                          {copiedId === invite.id ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteInvite(invite.id)}
                          disabled={deletingId === invite.id}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Löschen"
                          aria-label={`Einladung für ${invite.player_name} löschen`}
                        >
                          {deletingId === invite.id ? (
                            <Clock className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
