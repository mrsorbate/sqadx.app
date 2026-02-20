import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, Users, UserPlus, Shield } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
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

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

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

  if (teamsLoading || usersLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin-Panel</h1>
            <p className="text-gray-600 mt-1">Team- und Benutzerverwaltung</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateTeam(!showCreateTeam)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Team erstellen</span>
        </button>
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
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Users className="w-6 h-6 mr-2 text-primary-600" />
          Alle Teams ({teams?.length || 0})
        </h2>
        
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
            </div>
          ))}

          {teams?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
        <h2 className="text-xl font-semibold mb-4">Alle Benutzer ({users?.length || 0})</h2>
        
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
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.email}</div>
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
    </div>
  );
}
