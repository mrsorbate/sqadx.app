import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { eventsAPI, teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, HelpCircle, AlertCircle, ArrowRight, Users } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Admin wird zum Admin-Panel weitergeleitet
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await teamsAPI.getAll();
      return response.data;
    },
    enabled: user?.role === 'trainer',
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const response = await eventsAPI.getMyUpcoming();
      return response.data;
    },
  });

  // Mutation for event response
  const updateResponseMutation = useMutation({
    mutationFn: (data: { eventId: number; status: string }) =>
      eventsAPI.updateResponse(data.eventId, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });

  const getTeamPhotoUrl = (team: any): string | undefined => {
    if (team.team_picture) {
      return `http://localhost:3001${team.team_picture}`;
    }
    return undefined;
  };

  if (eventsLoading || (user?.role === 'trainer' && teamsLoading)) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Centered Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Willkommen zurück, {user?.name}!</p>
      </div>

      {/* Team Section (Trainers only) - Only show if team photos exist */}
      {user?.role === 'trainer' && teams && teams.length > 0 && teams.some((t: any) => t.team_picture) && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center justify-center">
            <Users className="w-6 h-6 mr-2 text-primary-600" />
            {teams.length === 1 ? 'Mein Team' : 'Meine Teams'}
          </h2>

          {teams.length === 1 ? (
            // Single team - simple display without upload
            getTeamPhotoUrl(teams[0]) && (
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{teams[0].name}</h3>
                <img
                  src={getTeamPhotoUrl(teams[0])}
                  alt={teams[0].name}
                  className="w-64 h-64 object-cover rounded-lg mx-auto shadow-lg"
                />
              </div>
            )
          ) : (
            // Multiple teams - side-by-side layout split with "/"
            <div className="flex items-center justify-center gap-0">
              {teams.filter((t: any) => getTeamPhotoUrl(t)).slice(0, 2).map((team: any, index: number) => (
                <div key={team.id} className="flex items-center">
                  {index > 0 && (
                    <div className="text-6xl font-thin text-gray-300 mx-2">/</div>
                  )}
                  <div className="text-center space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">{team.name}</h3>
                    <img
                      src={getTeamPhotoUrl(team)!}
                      alt={team.name}
                      className="w-48 h-48 object-cover rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Events Section */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-primary-600" />
          Nächste 6 Termine
        </h2>
        
        {eventsLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Lädt...</div>
        ) : upcomingEvents && upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event: any) => {
              const startDate = new Date(event.start_time);
              const endDate = new Date(event.end_time);
              const isToday = startDate.toDateString() === new Date().toDateString();
              
              const getStatusIcon = (status: string) => {
                switch (status) {
                  case 'accepted': return <CheckCircle className="w-5 h-5 text-green-600" />;
                  case 'declined': return <XCircle className="w-5 h-5 text-red-600" />;
                  case 'tentative': return <HelpCircle className="w-5 h-5 text-yellow-600" />;
                  default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
                }
              };

              const getStatusLabel = (status: string) => {
                switch (status) {
                  case 'accepted': return 'Zugesagt';
                  case 'declined': return 'Abgesagt';
                  case 'tentative': return 'Unsicher';
                  default: return 'Keine Antwort';
                }
              };

              const getTypeIcon = (type: string) => {
                switch (type) {
                  case 'training': return '🏃';
                  case 'match': return '⚽';
                  default: return '📅';
                }
              };

              const handleStatusClick = (status: string, e: React.MouseEvent) => {
                e.stopPropagation();
                updateResponseMutation.mutate({ eventId: event.id, status });
              };

              const handleCardClick = () => {
                window.location.href = `/events/${event.id}`;
              };

              const getButtonClass = (status: string) => {
                const isSelected = event.my_status === status;
                const baseClass = 'px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50';
                
                if (status === 'accepted') {
                  return `${baseClass} ${isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'}`;
                } else if (status === 'declined') {
                  return `${baseClass} ${isSelected ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'}`;
                } else if (status === 'tentative') {
                  return `${baseClass} ${isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50'}`;
                }
              };

              const locationText = [event.location_venue, event.location_street, event.location_zip_city]
                .filter(Boolean)
                .join(', ') || event.location;

              return (
                <div
                  key={event.id}
                  onClick={handleCardClick}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
                    isToday 
                      ? 'bg-primary-50 border-primary-300 dark:bg-primary-900/25 dark:border-primary-700' 
                      : 'bg-white border-gray-200 hover:border-primary-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-2xl">{getTypeIcon(event.type)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{event.team_name}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 ml-8">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {startDate.toLocaleDateString('de-DE', { 
                              weekday: 'short', 
                              day: '2-digit', 
                              month: '2-digit',
                              year: '2-digit'
                            })} um {startDate.toLocaleTimeString('de-DE', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {endDate.toLocaleTimeString('de-DE', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        
                        {locationText && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{locationText}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(event.my_status)}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{getStatusLabel(event.my_status)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                          {event.accepted_count}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                          {event.declined_count}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                          {event.tentative_count}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                          {event.pending_count}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Response Buttons */}
                  <div className="flex space-x-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <button
                      onClick={(e) => handleStatusClick('accepted', e)}
                      disabled={updateResponseMutation.isPending}
                      className={getButtonClass('accepted')}
                    >
                      ✓ Zugesagt
                    </button>
                    <button
                      onClick={(e) => handleStatusClick('tentative', e)}
                      disabled={updateResponseMutation.isPending}
                      className={getButtonClass('tentative')}
                    >
                      ? Vielleicht
                    </button>
                    <button
                      onClick={(e) => handleStatusClick('declined', e)}
                      disabled={updateResponseMutation.isPending}
                      className={getButtonClass('declined')}
                    >
                      ✗ Absagen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>Keine Termine in den nächsten 6 anstehend</p>
          </div>
        )}
      </div>

      <Link
        to="/events"
        className="block p-6 rounded-lg border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100 hover:border-primary-300 hover:shadow-md transition-all group dark:border-primary-800 dark:from-primary-900/30 dark:to-gray-800 dark:hover:border-primary-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Alle Termine anzeigen</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Vollständige Übersicht aller zukünftigen Termine</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    </div>
  );
}
