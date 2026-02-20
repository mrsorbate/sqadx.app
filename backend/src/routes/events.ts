import { Router } from 'express';
import db from '../database/init';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CreateEventDTO, UpdateEventResponseDTO } from '../types';
import { randomBytes } from 'crypto';

const router = Router();

router.use(authenticate);

// Helper function to generate recurring event dates
function generateRecurringDates(
  startTime: Date,
  endTime: Date,
  repeatType: string,
  repeatUntil: Date,
  repeatDays?: number[]
): Array<{ start: Date; end: Date }> {
  const dates: Array<{ start: Date; end: Date }> = [];
  const duration = endTime.getTime() - startTime.getTime();
  
  if (repeatType === 'weekly' && repeatDays && repeatDays.length > 0) {
    let currentDate = new Date(startTime);
    
    // Go through each week until repeat_until
    while (currentDate <= repeatUntil) {
      // Check each day of the week
      for (const dayOfWeek of repeatDays) {
        const eventDate = new Date(currentDate);
        const currentDay = eventDate.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
        eventDate.setDate(eventDate.getDate() + daysToAdd);
        
        // Only add if within the date range and not before start
        if (eventDate >= startTime && eventDate <= repeatUntil) {
          const start = new Date(eventDate);
          const end = new Date(start.getTime() + duration);
          dates.push({ start, end });
        }
      }
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
  } else if (repeatType === 'custom' && repeatDays && repeatDays.length > 0) {
    // Custom: specific days, but check all occurrences
    let currentDate = new Date(startTime);
    currentDate.setHours(0, 0, 0, 0); // Start from beginning of day
    
    while (currentDate <= repeatUntil) {
      if (repeatDays.includes(currentDate.getDay())) {
        const start = new Date(currentDate);
        start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        
        if (start >= startTime && start <= repeatUntil) {
          const end = new Date(start.getTime() + duration);
          dates.push({ start, end });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Sort by date
  dates.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  return dates;
}

// Get upcoming events for user (next 6 events)
router.get('/my-upcoming', (req: AuthRequest, res) => {
  try {
    const now = new Date().toISOString();

    const events = db.prepare(`
      SELECT e.*, 
             t.name as team_name,
             u.name as created_by_name,
             er.status as my_status,
             er.comment as my_comment,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'accepted') as accepted_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'declined') as declined_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'tentative') as tentative_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'pending') as pending_count
      FROM events e
      INNER JOIN teams t ON e.team_id = t.id
      INNER JOIN users u ON e.created_by = u.id
      INNER JOIN team_members tm ON e.team_id = tm.team_id AND tm.user_id = ?
      LEFT JOIN event_responses er ON er.event_id = e.id AND er.user_id = ?
      WHERE e.start_time >= ?
      ORDER BY e.start_time ASC
      LIMIT 6
    `).all(req.user!.id, req.user!.id, now);

    res.json(events);
  } catch (error) {
    console.error('Get my upcoming events error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Get all future events for user across all teams
router.get('/my-all', (req: AuthRequest, res) => {
  try {
    const now = new Date().toISOString();

    const events = db.prepare(`
      SELECT e.*, 
             t.name as team_name,
             u.name as created_by_name,
             er.status as my_status,
             er.comment as my_comment,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'accepted') as accepted_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'declined') as declined_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'tentative') as tentative_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'pending') as pending_count
      FROM events e
      INNER JOIN teams t ON e.team_id = t.id
      INNER JOIN users u ON e.created_by = u.id
      INNER JOIN team_members tm ON e.team_id = tm.team_id AND tm.user_id = ?
      LEFT JOIN event_responses er ON er.event_id = e.id AND er.user_id = ?
      WHERE e.start_time >= ?
      ORDER BY e.start_time ASC
    `).all(req.user!.id, req.user!.id, now);

    res.json(events);
  } catch (error) {
    console.error('Get my all events error:', error);
    res.status(500).json({ error: 'Failed to fetch all events' });
  }
});

// Get events for a team
router.get('/', (req: AuthRequest, res) => {
  try {
    const { team_id, from, to } = req.query;

    if (!team_id) {
      return res.status(400).json({ error: 'team_id is required' });
    }

    // Check membership
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(team_id, req.user!.id);

    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    let query = `
      SELECT e.*, 
             u.name as created_by_name,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'accepted') as accepted_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'declined') as declined_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'tentative') as tentative_count,
             (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND status = 'pending') as pending_count
      FROM events e
      INNER JOIN users u ON e.created_by = u.id
      WHERE e.team_id = ?
    `;

    const params: any[] = [team_id];

    if (from) {
      query += ' AND e.start_time >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND e.start_time <= ?';
      params.push(to);
    }

    query += ' ORDER BY e.start_time DESC';

    const events = db.prepare(query).all(...params);

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/:id', (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);

    const event = db.prepare(`
      SELECT e.*, u.name as created_by_name
      FROM events e
      INNER JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `).get(eventId) as any;

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check membership
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(event.team_id, req.user!.id) as any;

    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    // Get responses
    let responses = db.prepare(`
      SELECT er.*, u.name as user_name
      FROM event_responses er
      INNER JOIN users u ON er.user_id = u.id
      WHERE er.event_id = ?
      ORDER BY er.responded_at DESC
    `).all(eventId);

    const canViewResponses = membership.role === 'trainer' || event.visibility_all === 1 || event.visibility_all === true;
    if (!canViewResponses) {
      responses = responses.filter((response: any) => response.user_id === req.user!.id);
    }

    res.json({ ...event, responses });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event (or series)
router.post('/', (req: AuthRequest, res) => {
  try {
    const { 
      team_id, 
      title, 
      type, 
      description, 
      location,
      location_venue,
      location_street,
      location_zip_city,
      pitch_type,
      meeting_point,
      arrival_minutes,
      start_time, 
      end_time,
      rsvp_deadline,
      duration_minutes,
      visibility_all = true,
      invite_all = true,
      invited_user_ids = [],
      repeat_type,
      repeat_until,
      repeat_days
    }: CreateEventDTO = req.body;

    if (!team_id || !title || !type || !start_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let resolvedEndTime = end_time;
    if (duration_minutes && start_time) {
      const startDate = new Date(start_time);
      const computedEnd = new Date(startDate.getTime() + duration_minutes * 60000);
      resolvedEndTime = computedEnd.toISOString();
    }

    if (!resolvedEndTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const resolvedLocation = location_venue || location || null;

    // Check if user is trainer
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(team_id, req.user!.id) as any;

    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can create events' });
    }

    // Get all team members for responses
    const members = db.prepare('SELECT user_id FROM team_members WHERE team_id = ?').all(team_id) as any[];
    const memberIds = members.map((member) => member.user_id);

    let invitedUserIds = invited_user_ids?.length ? invited_user_ids : (invite_all ? memberIds : []);
    invitedUserIds = invitedUserIds.filter((id) => memberIds.includes(id));

    if (invitedUserIds.length === 0) {
      return res.status(400).json({ error: 'At least one invited user is required' });
    }
    
    // Check if this is a recurring event
    const isRecurring = repeat_type && repeat_type !== 'none' && repeat_until && repeat_days && repeat_days.length > 0;
    
    if (isRecurring) {
      // Generate series ID
      const seriesId = randomBytes(16).toString('hex');
      
      // Generate all event dates
      const startDate = new Date(start_time);
      const endDate = new Date(resolvedEndTime);
      const untilDate = new Date(repeat_until);
      
      const eventDates = generateRecurringDates(startDate, endDate, repeat_type!, untilDate, repeat_days);
      
      if (eventDates.length === 0) {
        return res.status(400).json({ error: 'No valid dates generated for recurring event' });
      }
      
      // Create all events in the series
      const stmt = db.prepare(
        'INSERT INTO events (team_id, title, type, description, location, location_venue, location_street, location_zip_city, pitch_type, meeting_point, arrival_minutes, start_time, end_time, rsvp_deadline, duration_minutes, visibility_all, invite_all, created_by, series_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      
      const responseStmt = db.prepare(
        'INSERT INTO event_responses (event_id, user_id, status) VALUES (?, ?, ?)'
      );
      
      const createdEvents = [];
      
      for (const { start, end } of eventDates) {
        const result = stmt.run(
          team_id, 
          title, 
          type, 
          description, 
          resolvedLocation,
          location_venue || null,
          location_street || null,
          location_zip_city || null,
          pitch_type || null,
          meeting_point || null,
          arrival_minutes ?? null,
          start.toISOString(), 
          end.toISOString(), 
          rsvp_deadline || null,
          duration_minutes ?? null,
          visibility_all ? 1 : 0,
          invite_all ? 1 : 0,
          req.user!.id,
          seriesId
        );
        
        // Create pending responses for all team members
        for (const userId of invitedUserIds) {
          responseStmt.run(result.lastInsertRowid, userId, 'pending');
        }
        
        createdEvents.push({
          id: result.lastInsertRowid,
          start_time: start.toISOString(),
          end_time: end.toISOString()
        });
      }
      
      return res.status(201).json({
        message: `Created ${createdEvents.length} events in series`,
        series_id: seriesId,
        events: createdEvents
      });
    } else {
      // Create single event
      const stmt = db.prepare(
        'INSERT INTO events (team_id, title, type, description, location, location_venue, location_street, location_zip_city, pitch_type, meeting_point, arrival_minutes, start_time, end_time, rsvp_deadline, duration_minutes, visibility_all, invite_all, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run(
        team_id,
        title,
        type,
        description,
        resolvedLocation,
        location_venue || null,
        location_street || null,
        location_zip_city || null,
        pitch_type || null,
        meeting_point || null,
        arrival_minutes ?? null,
        start_time,
        resolvedEndTime,
        rsvp_deadline || null,
        duration_minutes ?? null,
        visibility_all ? 1 : 0,
        invite_all ? 1 : 0,
        req.user!.id
      );

      // Create pending responses for all team members
      const responseStmt = db.prepare(
        'INSERT INTO event_responses (event_id, user_id, status) VALUES (?, ?, ?)'
      );

      for (const userId of invitedUserIds) {
        responseStmt.run(result.lastInsertRowid, userId, 'pending');
      }

      return res.status(201).json({
        id: result.lastInsertRowid,
        team_id,
        title,
        type,
        description,
        location,
        start_time,
        end_time: resolvedEndTime,
        rsvp_deadline: rsvp_deadline || null,
        duration_minutes: duration_minutes ?? null,
        visibility_all: visibility_all ? 1 : 0,
        invite_all: invite_all ? 1 : 0,
        created_by: req.user!.id
      });
    }
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event response
router.post('/:id/response', (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { status, comment }: UpdateEventResponseDTO = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Check if event exists and user is member
    const event = db.prepare('SELECT team_id FROM events WHERE id = ?').get(eventId) as any;
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(event.team_id, req.user!.id);

    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    // Update or create response
    const stmt = db.prepare(`
      INSERT INTO event_responses (event_id, user_id, status, comment)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(event_id, user_id) 
      DO UPDATE SET status = ?, comment = ?, responded_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(eventId, req.user!.id, status, comment, status, comment);

    res.json({ success: true, status, comment });
  } catch (error) {
    console.error('Update response error:', error);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

// Update event response for a specific user (trainer only)
router.post('/:id/response/:userId', (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const { status, comment }: UpdateEventResponseDTO = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Check if event exists
    const event = db.prepare('SELECT team_id FROM events WHERE id = ?').get(eventId) as any;
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is trainer in this team
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(event.team_id, req.user!.id) as any;

    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can update player responses' });
    }

    // Verify that the target user is also a member
    const targetMembership = db.prepare(
      'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(event.team_id, userId);

    if (!targetMembership) {
      return res.status(404).json({ error: 'User is not a team member' });
    }

    // Update or create response
    const stmt = db.prepare(`
      INSERT INTO event_responses (event_id, user_id, status, comment)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(event_id, user_id) 
      DO UPDATE SET status = ?, comment = ?, responded_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(eventId, userId, status, comment, status, comment);

    res.json({ success: true, status, comment, user_id: userId });
  } catch (error) {
    console.error('Update response for user error:', error);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

// Delete event (or series)
router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const deleteSeries = req.query.delete_series === 'true';

    // Check if event exists
    const event = db.prepare('SELECT team_id, series_id FROM events WHERE id = ?').get(eventId) as any;
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is trainer
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(event.team_id, req.user!.id) as any;

    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can delete events' });
    }

    // Delete event or entire series
    if (deleteSeries && event.series_id) {
      // Delete all events in the series
      const result = db.prepare('DELETE FROM events WHERE series_id = ?').run(event.series_id);
      res.json({ success: true, deleted_count: result.changes });
    } else {
      // Delete single event (cascading deletes will handle event_responses)
      db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
      res.json({ success: true, deleted_count: 1 });
    }
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
