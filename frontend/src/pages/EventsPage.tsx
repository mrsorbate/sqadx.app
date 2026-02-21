import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { eventsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Plus, ArrowLeft, MapPin, Clock } from 'lucide-react';

export default function EventsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const teamId = id ? parseInt(id) : null;
  const { user } = useAuthStore();
  const isTrainer = user?.role === 'trainer';
  const createdSuccess = searchParams.get('created') === '1';

  // Query all events or team events based on URL param
  const { data: events, isLoading } = useQuery({
    queryKey: teamId ? ['events', teamId] : ['all-events'],
    queryFn: async () => {
      if (teamId) {
        const response = await eventsAPI.getAll(teamId);
        return response.data;
      } else {
        const response = await eventsAPI.getMyAll();
        return response.data;
      }
    },
  });


  if (isLoading) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link to={teamId ? `/teams/${teamId}` : '/'} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {teamId ? 'Termine' : 'Alle Termine'}
          </h1>
        </div>

        {isTrainer && (
          <Link
            to={teamId ? `/teams/${teamId}/events/new` : '/events/new'}
            className="btn btn-primary w-full sm:w-auto flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Termin erstellen</span>
          </Link>
        )}
      </div>

      {createdSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Termin wurde erfolgreich erstellt.
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {events?.map((event: any) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="block p-4 rounded-lg border-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">
                    {event.type === 'training' && '🏃'}
                    {event.type === 'match' && '⚽'}
                    {event.type === 'other' && '📅'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 ml-0 sm:ml-11">
                  {(() => {
                    const parts = [event.location_venue, event.location_street, event.location_zip_city].filter(Boolean);
                    const locationText = parts.length ? parts.join(', ') : event.location;
                    return locationText ? (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{locationText}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(event.start_time), 'PPp', { locale: de })}
                    </span>
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{event.description}</p>
                )}
              </div>

              {/* Response Stats */}
              <div className="flex flex-col items-start sm:items-end space-y-2 sm:ml-4">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    <span className="font-semibold">✓</span>
                    <span>{event.accepted_count}</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    <span className="font-semibold">✗</span>
                    <span>{event.declined_count}</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                    <span className="font-semibold">?</span>
                    <span>{event.tentative_count}</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                    <span className="font-semibold">⏳</span>
                    <span>{event.pending_count}</span>
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {events?.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Calendar className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">Noch keine Termine</p>
            <p className="text-sm mt-2">
              {teamId ? (
                isTrainer ? 'Erstelle den ersten Termin!' : 'Warte auf Termine vom Trainer.'
              ) : (
                'Keine zukünftigen Termine anstehend.'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
