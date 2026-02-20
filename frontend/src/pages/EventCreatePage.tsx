import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { eventsAPI, teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft } from 'lucide-react';

export default function EventCreatePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const teamIdFromParam = id ? parseInt(id) : null;
  const teamIdFromQuery = searchParams.get('teamId') ? parseInt(searchParams.get('teamId') as string, 10) : null;
  const initialTeamId = teamIdFromParam ?? teamIdFromQuery;

  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isTrainer = user?.role === 'trainer';

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(initialTeamId);
  const [eventData, setEventData] = useState({
    title: '',
    type: 'training' as 'training' | 'match' | 'other',
    description: '',
    location: '',
    location_venue: '',
    location_street: '',
    location_zip_city: '',
    pitch_type: '',
    meeting_point: '',
    arrival_minutes: '',
    start_time: '',
    duration_minutes: '',
    end_time: '',
    rsvp_deadline: '',
    visibility_all: true,
    invite_all: true,
    invited_user_ids: [] as number[],
    repeat_type: 'none' as 'none' | 'weekly' | 'custom',
    repeat_until: '',
    repeat_days: [] as number[],
  });

  const { data: teamsForCreate } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await teamsAPI.getAll();
      return response.data;
    },
    enabled: isTrainer,
  });

  useEffect(() => {
    if (initialTeamId) {
      setSelectedTeamId(initialTeamId);
      return;
    }
    if (teamsForCreate?.length && selectedTeamId === null) {
      setSelectedTeamId(teamsForCreate[0].id);
    }
  }, [initialTeamId, teamsForCreate, selectedTeamId]);

  const effectiveTeamId = selectedTeamId;

  const { data: membersForCreate } = useQuery({
    queryKey: ['team-members', effectiveTeamId],
    queryFn: async () => {
      const response = await teamsAPI.getMembers(effectiveTeamId!);
      return response.data;
    },
    enabled: isTrainer && !!effectiveTeamId,
  });

  useEffect(() => {
    if (!eventData.start_time || !eventData.duration_minutes) {
      return;
    }

    const startDate = new Date(eventData.start_time);
    if (isNaN(startDate.getTime())) {
      return;
    }

    const minutes = parseInt(eventData.duration_minutes, 10);
    if (Number.isNaN(minutes)) {
      return;
    }

    const endDate = new Date(startDate.getTime() + minutes * 60000);
    const pad = (value: number) => value.toString().padStart(2, '0');
    const formatted = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

    if (eventData.end_time !== formatted) {
      setEventData((prev) => ({ ...prev, end_time: formatted }));
    }
  }, [eventData.start_time, eventData.duration_minutes, eventData.end_time]);

  useEffect(() => {
    if (!membersForCreate?.length) {
      return;
    }

    if (eventData.invited_user_ids.length === 0) {
      const allIds = membersForCreate.map((member: any) => member.id);
      setEventData((prev) => ({ ...prev, invited_user_ids: allIds }));
    }
  }, [membersForCreate, eventData.invited_user_ids.length]);

  useEffect(() => {
    if (!effectiveTeamId) {
      return;
    }
    setEventData((prev) => ({ ...prev, invited_user_ids: [], invite_all: true }));
  }, [effectiveTeamId]);

  const createEventMutation = useMutation({
    mutationFn: (data: any) => eventsAPI.create(data),
    onSuccess: () => {
      if (effectiveTeamId !== null) {
        queryClient.invalidateQueries({ queryKey: ['events', effectiveTeamId] });
      }
      queryClient.invalidateQueries({ queryKey: ['all-events'] });
      navigate(effectiveTeamId ? `/teams/${effectiveTeamId}/events?created=1` : '/events?created=1');
    },
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveTeamId) {
      return;
    }

    if (!eventData.end_time) {
      return;
    }

    const resolvedLocation = eventData.location_venue || eventData.location_zip_city || eventData.location;
    const dataToSend: any = {
      team_id: effectiveTeamId,
      title: eventData.title,
      type: eventData.type,
      description: eventData.description,
      location: resolvedLocation,
      location_venue: eventData.location_venue,
      location_street: eventData.location_street,
      location_zip_city: eventData.location_zip_city,
      pitch_type: eventData.pitch_type || undefined,
      meeting_point: eventData.meeting_point || undefined,
      arrival_minutes: eventData.arrival_minutes ? parseInt(eventData.arrival_minutes, 10) : undefined,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      duration_minutes: eventData.duration_minutes ? parseInt(eventData.duration_minutes, 10) : undefined,
      visibility_all: eventData.visibility_all,
      invite_all: eventData.invite_all,
      invited_user_ids: eventData.invited_user_ids,
    };

    if (eventData.rsvp_deadline) {
      dataToSend.rsvp_deadline = eventData.rsvp_deadline;
    }

    if (eventData.repeat_type !== 'none') {
      dataToSend.repeat_type = eventData.repeat_type;
      dataToSend.repeat_until = eventData.repeat_until;
      dataToSend.repeat_days = eventData.repeat_days;
    }

    createEventMutation.mutate(dataToSend);
  };

  if (!isTrainer) {
    return <Navigate to="/events" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to={effectiveTeamId ? `/teams/${effectiveTeamId}/events` : '/events'} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Neuen Termin erstellen</h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!initialTeamId && teamsForCreate?.length === 1 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Team</label>
                <div className="mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700">
                  {teamsForCreate[0].name}
                </div>
              </div>
            )}
            {!initialTeamId && (!teamsForCreate || teamsForCreate.length > 1) && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Team *</label>
                <select
                  value={selectedTeamId ?? ''}
                  onChange={(e) => setSelectedTeamId(parseInt(e.target.value, 10))}
                  className="input mt-1"
                  required
                >
                  {teamsForCreate?.length ? (
                    teamsForCreate.map((team: any) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Keine Teams verfuegbar
                    </option>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Kategorie *</label>
              <select
                value={eventData.type}
                onChange={(e) => setEventData({ ...eventData, type: e.target.value as any })}
                className="input mt-1"
              >
                <option value="training">Training</option>
                <option value="match">Spiel</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Titel *</label>
              <input
                type="text"
                required
                value={eventData.title}
                onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                className="input mt-1"
                placeholder="z.B. Training, Heimspiel gegen..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Beginn *</label>
              <input
                type="datetime-local"
                required
                value={eventData.start_time}
                onChange={(e) => setEventData({ ...eventData, start_time: e.target.value })}
                className="input mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Dauer (Minuten) *</label>
              <input
                type="number"
                min={1}
                required
                value={eventData.duration_minutes}
                onChange={(e) => setEventData({ ...eventData, duration_minutes: e.target.value })}
                className="input mt-1"
                placeholder="z.B. 90"
              />
              {eventData.end_time && (
                <p className="text-xs text-gray-500 mt-1">Ende: {eventData.end_time.replace('T', ' ')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ort oder Spielstaette</label>
              <input
                type="text"
                value={eventData.location_venue}
                onChange={(e) => setEventData({ ...eventData, location_venue: e.target.value })}
                className="input mt-1"
                placeholder="z.B. Sportzentrum Sued"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Strasse</label>
              <input
                type="text"
                value={eventData.location_street}
                onChange={(e) => setEventData({ ...eventData, location_street: e.target.value })}
                className="input mt-1"
                placeholder="z.B. Musterstrasse 12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">PLZ Ort</label>
              <input
                type="text"
                value={eventData.location_zip_city}
                onChange={(e) => setEventData({ ...eventData, location_zip_city: e.target.value })}
                className="input mt-1"
                placeholder="z.B. 12345 Musterstadt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Platzart</label>
              <select
                value={eventData.pitch_type}
                onChange={(e) => setEventData({ ...eventData, pitch_type: e.target.value })}
                className="input mt-1"
              >
                <option value="">Auswaehlen</option>
                <option value="Rasen">Rasen</option>
                <option value="Kunstrasen">Kunstrasen</option>
                <option value="Halle">Halle</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Treffpunkt</label>
              <input
                type="text"
                value={eventData.meeting_point}
                onChange={(e) => setEventData({ ...eventData, meeting_point: e.target.value })}
                className="input mt-1"
                placeholder="z.B. Parkplatz Haupttor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">X Minuten vor dem Termin</label>
              <input
                type="number"
                min={0}
                value={eventData.arrival_minutes}
                onChange={(e) => setEventData({ ...eventData, arrival_minutes: e.target.value })}
                className="input mt-1"
                placeholder="z.B. 15"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Optionale Beschreibung</label>
              <textarea
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                className="input mt-1"
                rows={3}
                placeholder="Optionale Details..."
              />
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Einstellungen</h4>

              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={eventData.invite_all}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked && membersForCreate?.length) {
                        const allIds = membersForCreate.map((member: any) => member.id);
                        setEventData({ ...eventData, invite_all: checked, invited_user_ids: allIds });
                      } else {
                        setEventData({ ...eventData, invite_all: checked });
                      }
                    }}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-700">Alle Teammitglieder einladen</span>
                </label>

                {membersForCreate?.length ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Einladungen anpassen</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {membersForCreate.map((member: any) => {
                        const isChecked = eventData.invited_user_ids.includes(member.id);
                        return (
                          <label key={member.id} className="flex items-center space-x-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const nextIds = e.target.checked
                                  ? [...eventData.invited_user_ids, member.id]
                                  : eventData.invited_user_ids.filter((value) => value !== member.id);
                                setEventData({ ...eventData, invited_user_ids: nextIds });
                              }}
                              className="h-4 w-4 text-primary-600"
                            />
                            <span>{member.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Rueckmeldefrist</label>
                  <input
                    type="datetime-local"
                    value={eventData.rsvp_deadline}
                    onChange={(e) => setEventData({ ...eventData, rsvp_deadline: e.target.value })}
                    className="input mt-1"
                  />
                </div>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={eventData.visibility_all}
                    onChange={(e) => setEventData({ ...eventData, visibility_all: e.target.checked })}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-700">Teilnehmerliste fuer alle sichtbar</span>
                </label>
              </div>
            </div>

            {/* Repeat Options */}
            <div className="md:col-span-2 border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Serientermin</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wiederholen</label>
                  <select
                    value={eventData.repeat_type}
                    onChange={(e) => setEventData({ ...eventData, repeat_type: e.target.value as any, repeat_days: [] })}
                    className="input"
                  >
                    <option value="none">Nicht wiederholen</option>
                    <option value="weekly">Woechentlich</option>
                    <option value="custom">Bestimmte Wochentage</option>
                  </select>
                </div>

                {eventData.repeat_type !== 'none' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Wochentage auswaehlen</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 1, label: 'Mo' },
                          { value: 2, label: 'Di' },
                          { value: 3, label: 'Mi' },
                          { value: 4, label: 'Do' },
                          { value: 5, label: 'Fr' },
                          { value: 6, label: 'Sa' },
                          { value: 0, label: 'So' },
                        ].map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              const newDays = eventData.repeat_days.includes(day.value)
                                ? eventData.repeat_days.filter((d) => d !== day.value)
                                : [...eventData.repeat_days, day.value];
                              setEventData({ ...eventData, repeat_days: newDays });
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              eventData.repeat_days.includes(day.value)
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {eventData.repeat_type === 'weekly'
                          ? 'Waehlte die Wochentage aus, an denen der Termin stattfindet'
                          : 'Waehlte alle gewuenschten Wochentage'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Wiederholung endet am *</label>
                      <input
                        type="date"
                        required={eventData.repeat_type === 'weekly' || eventData.repeat_type === 'custom'}
                        value={eventData.repeat_until}
                        onChange={(e) => setEventData({ ...eventData, repeat_until: e.target.value })}
                        className="input mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Bis zu welchem Datum sollen die Termine erstellt werden?</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                createEventMutation.isPending ||
                !effectiveTeamId ||
                eventData.invited_user_ids.length === 0
              }
            >
              {createEventMutation.isPending ? 'Erstellt...' : 'Termin erstellen'}
            </button>
            <button
              type="button"
              onClick={() => navigate(effectiveTeamId ? `/teams/${effectiveTeamId}/events` : '/events')}
              className="btn btn-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
