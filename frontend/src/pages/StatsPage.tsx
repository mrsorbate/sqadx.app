import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { statsAPI } from '../lib/api';
import { ArrowLeft, TrendingUp, Calendar } from 'lucide-react';

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id!);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['team-stats', teamId],
    queryFn: async () => {
      const response = await statsAPI.getTeamStats(teamId);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to={`/teams/${teamId}`} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Statistiken</h1>
      </div>

      {/* Event Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Kommende Termine</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.events?.upcoming || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Vergangene Termine</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.events?.past || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Statistics */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-primary-600" />
          Anwesenheitsstatistik
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spieler
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teilnahme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zugesagt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abgesagt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keine Antwort
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.attendance?.map((player: any) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{player.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${player.attendance_rate || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {player.attendance_rate || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-green-700 font-medium">{player.accepted}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-red-700 font-medium">{player.declined}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 font-medium">{player.pending}</span>
                  </td>
                </tr>
              ))}            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
