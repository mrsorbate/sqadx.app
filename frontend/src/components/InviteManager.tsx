import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invitesAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Copy, Plus, Trash2, Link as LinkIcon, Check } from 'lucide-react';

interface InviteManagerProps {
  teamId: number;
  teamName: string;
}

export default function InviteManager({ teamId }: InviteManagerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const inviteRole = user?.role === 'admin' ? 'trainer' : 'player';
  const inviteRoleLabel = inviteRole === 'trainer' ? 'Trainer' : 'Spieler';
  const inviteHeading = inviteRole === 'player' ? 'Spieler anlegen & Einladungslinks' : 'Einladungslinks';
  const createButtonLabel = inviteRole === 'player' ? 'Spieler anlegen' : 'Neuer Link';
  const createFormTitle = inviteRole === 'player' ? 'Spieler anlegen' : 'Neuen Einladungslink erstellen';
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  const [inviteData, setInviteData] = useState({
    role: inviteRole,
    inviteeName: '',
    expiresInDays: 7,
    maxUses: undefined as number | undefined,
  });

  const { data: invites, isLoading } = useQuery({
    queryKey: ['team-invites', teamId],
    queryFn: async () => {
      const response = await invitesAPI.getTeamInvites(teamId);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => invitesAPI.createInvite(teamId, inviteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] });
      setShowCreateForm(false);
      setInviteData({ role: inviteRole, inviteeName: '', expiresInDays: 7, maxUses: undefined });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (inviteId: number) => invitesAPI.deleteInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] });
    },
  });

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.inviteeName.trim()) {
      return;
    }
    createMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-4">Lädt...</div>;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <LinkIcon className="w-5 h-5 mr-2 text-primary-600" />
          {inviteHeading}
        </h2>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{createButtonLabel}</span>
          </button>
        )}
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <h3 className="font-semibold">{createFormTitle}</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Einladungsart
            </label>
            <input
              type="text"
              value={inviteRoleLabel}
              readOnly
              className="input bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vorgegebener Name
            </label>
            <input
              type="text"
              required
              value={inviteData.inviteeName}
              onChange={(e) => setInviteData({ ...inviteData, inviteeName: e.target.value })}
              className="input"
              placeholder={inviteRole === 'trainer' ? 'z. B. Max Trainer' : 'z. B. Lena Spieler'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Der Name wird bei der Registrierung fest übernommen und kann nicht geändert werden.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gültig für (Tage)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={inviteData.expiresInDays}
                onChange={(e) => setInviteData({ ...inviteData, expiresInDays: parseInt(e.target.value) })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max. Verwendungen
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unbegrenzt"
                value={inviteData.maxUses || ''}
                onChange={(e) => setInviteData({ ...inviteData, maxUses: e.target.value ? parseInt(e.target.value) : undefined })}
                className="input"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn btn-primary"
            >
              {createMutation.isPending ? 'Erstellt...' : 'Link erstellen'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn btn-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {invites && invites.length > 0 ? (
        <div className="space-y-3">
          {invites.map((invite: any) => {
            const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
            const isMaxedOut = invite.max_uses && invite.used_count >= invite.max_uses;
            const inviteUrl = `${window.location.origin}/invite/${invite.token}`;

            return (
              <div
                key={invite.id}
                className={`p-4 rounded-lg border ${
                  isExpired || isMaxedOut ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium capitalize text-gray-900">
                        {invite.role}
                      </span>
                      {(isExpired || isMaxedOut) && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                          {isExpired ? 'Abgelaufen' : 'Limit erreicht'}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      {invite.player_name && (
                        <p>
                          Vorgabe: <span className="font-medium">{invite.player_name}</span>
                        </p>
                      )}
                      <p>
                        Verwendet: {invite.used_count}
                        {invite.max_uses && ` / ${invite.max_uses}`}
                      </p>
                      {invite.expires_at && (
                        <p>
                          Gültig bis: {new Date(invite.expires_at).toLocaleDateString('de-DE')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Erstellt von {invite.created_by_name}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteUrl}
                        className="input text-sm flex-1 bg-gray-50"
                      />
                      <button
                        onClick={() => copyInviteLink(invite.token)}
                        className="btn btn-secondary flex items-center space-x-1"
                        title="Link kopieren"
                      >
                        {copiedToken === invite.token ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">Kopiert!</span>
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

                  <button
                    onClick={() => {
                      if (confirm('Einladungslink wirklich löschen?')) {
                        deleteMutation.mutate(invite.id);
                      }
                    }}
                    className="ml-4 text-red-600 hover:text-red-700"
                    title="Link löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Noch keine Einladungslinks erstellt</p>
          <p className="text-sm mt-1">Erstelle einen Link, um {inviteRoleLabel.toLowerCase()} einzuladen</p>
        </div>
      )}
    </div>
  );
}
