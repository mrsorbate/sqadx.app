import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invitesAPI } from '../lib/api';
import { Copy, Plus, Trash2, Check, Mail } from 'lucide-react';
import { useToast } from '../lib/useToast';

interface PlayerInviteManagerProps {
  teamId: number;
}

export default function PlayerInviteManager({ teamId }: PlayerInviteManagerProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [inviteData, setInviteData] = useState({
    inviteeName: '',
    expiresInDays: 7,
    maxUses: undefined as number | undefined,
  });

  const { data: invites, isLoading } = useQuery({
    queryKey: ['team-invites', teamId],
    queryFn: async () => {
      const response = await invitesAPI.getTeamInvites(teamId);
      // Filter nur Spieler-Einladungen
      return response.data.filter((inv: any) =>
        inv.player_name && (!inv.max_uses || inv.used_count < inv.max_uses)
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      invitesAPI.createInvite(teamId, {
        role: 'player',
        inviteeName: inviteData.inviteeName,
        expiresInDays: inviteData.expiresInDays,
        maxUses: inviteData.maxUses,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] });
      showToast('Spieler-Einladung erstellt', 'success');
      setShowCreateForm(false);
      setInviteData({ inviteeName: '', expiresInDays: 7, maxUses: undefined });
    },
    onError: () => {
      showToast('Fehler beim Erstellen der Einladung', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (inviteId: number) => invitesAPI.deleteInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] });
      showToast('Einladung gelöscht', 'success');
      setDeletingId(null);
    },
    onError: () => {
      showToast('Fehler beim Löschen', 'error');
    },
  });

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
    deleteMutation.mutate(inviteId);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.inviteeName.trim()) {
      showToast('Bitte einen Namen eingeben', 'warning');
      return;
    }
    createMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-4">Lädt...</div>;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
          <span className="mr-2">👥</span>
          Spieler anlegen & Einladungen
        </h2>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Neuer Spieler</span>
          </button>
        )}
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">Spieler einladen</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Spielername
            </label>
            <input
              type="text"
              required
              value={inviteData.inviteeName}
              onChange={(e) => setInviteData({ ...inviteData, inviteeName: e.target.value })}
              className="input"
              placeholder="z. B. Lena Spieler"
              title="Spielername"
              aria-label="Spielername"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gültig für (Tage)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={inviteData.expiresInDays}
                onChange={(e) => setInviteData({ ...inviteData, expiresInDays: parseInt(e.target.value) })}
                className="input"
                title="Gültigkeitsdauer in Tagen"
                aria-label="Gültigkeitsdauer in Tagen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max. Verwendungen (optional)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unbegrenzt"
                value={inviteData.maxUses || ''}
                onChange={(e) =>
                  setInviteData({ ...inviteData, maxUses: e.target.value ? parseInt(e.target.value) : undefined })
                }
                className="input"
                title="Maximale Anzahl Verwendungen"
                aria-label="Maximale Anzahl Verwendungen"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
              {createMutation.isPending ? 'Erstellt...' : 'Einladung erstellen'}
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {invites && invites.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Gültig bis</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite: any) => (
                <tr
                  key={`invite-${invite.id}`}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{invite.player_name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                      <Mail className="w-3 h-3 mr-1" />
                      Eingeladen
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString('de-DE') : 'Unbegrenzt'}
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
                        <div className="w-5 h-5 animate-spin border-2 border-red-400 border-t-transparent rounded-full" />
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
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Mail className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
          <p>Noch keine Spieler eingeladen</p>
          <p className="text-sm mt-1">Erstelle eine Einladung, um Spieler hinzuzufügen</p>
        </div>
      )}
    </div>
  );
}
