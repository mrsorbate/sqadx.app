import Database from 'better-sqlite3';
import path from 'path';
import type { Database as DatabaseType } from 'better-sqlite3';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');
const db: DatabaseType = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Organization settings table
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'TeamPilot Verein',
    logo TEXT,
    timezone TEXT DEFAULT 'Europe/Berlin',
    setup_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'trainer', 'player')),
    profile_picture TEXT,
    birth_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Teams table
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- Team members table
  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('trainer', 'player', 'staff')),
    jersey_number INTEGER,
    position TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id)
  );

  -- Events table (trainings and matches)
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('training', 'match', 'other')),
    description TEXT,
    location TEXT,
    location_venue TEXT,
    location_street TEXT,
    location_zip_city TEXT,
    pitch_type TEXT,
    meeting_point TEXT,
    arrival_minutes INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    rsvp_deadline DATETIME,
    duration_minutes INTEGER,
    visibility_all INTEGER DEFAULT 1,
    invite_all INTEGER DEFAULT 1,
    created_by INTEGER NOT NULL,
    series_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- Event responses table (Zu-/Absagen)
  CREATE TABLE IF NOT EXISTS event_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('accepted', 'declined', 'tentative', 'pending')),
    comment TEXT,
    responded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)
  );

  -- Team invitations table
  CREATE TABLE IF NOT EXISTS team_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('trainer', 'player', 'staff')),
    created_by INTEGER NOT NULL,
    expires_at DATETIME,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER DEFAULT 0,
    player_name TEXT,
    player_birth_date DATE,
    player_jersey_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
  CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_events_team ON events(team_id);
  CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
  CREATE INDEX IF NOT EXISTS idx_event_responses_event ON event_responses(event_id);
  CREATE INDEX IF NOT EXISTS idx_event_responses_user ON event_responses(user_id);
  CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
  CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);
`);

// Migration: Add profile_picture column if it doesn't exist
try {
  const columns = db.pragma('table_info(users)') as Array<{ name: string }>;
  const hasProfilePicture = columns.some((col) => col.name === 'profile_picture');
  if (!hasProfilePicture) {
    db.exec('ALTER TABLE users ADD COLUMN profile_picture TEXT');
    console.log('✅ Added profile_picture column to users table');
  }
  
  const hasBirthDate = columns.some((col) => col.name === 'birth_date');
  if (!hasBirthDate) {
    db.exec('ALTER TABLE users ADD COLUMN birth_date DATE');
    console.log('✅ Added birth_date column to users table');
  }
  
  // Add player info columns to team_invites
  const inviteColumns = db.pragma('table_info(team_invites)') as Array<{ name: string }>;
  const hasPlayerName = inviteColumns.some((col) => col.name === 'player_name');
  if (!hasPlayerName) {
    db.exec('ALTER TABLE team_invites ADD COLUMN player_name TEXT');
    db.exec('ALTER TABLE team_invites ADD COLUMN player_birth_date DATE');
    db.exec('ALTER TABLE team_invites ADD COLUMN player_jersey_number INTEGER');
    console.log('✅ Added player info columns to team_invites table');
  }
  
  // Add series_id to events for recurring events
  const eventColumns = db.pragma('table_info(events)') as Array<{ name: string }>;
  const hasSeriesId = eventColumns.some((col) => col.name === 'series_id');
  if (!hasSeriesId) {
    db.exec('ALTER TABLE events ADD COLUMN series_id TEXT');
    console.log('✅ Added series_id column to events table');
  }
  
  // Add rsvp_deadline to events
  const hasRsvpDeadline = eventColumns.some((col) => col.name === 'rsvp_deadline');
  if (!hasRsvpDeadline) {
    db.exec('ALTER TABLE events ADD COLUMN rsvp_deadline DATETIME');
    console.log('✅ Added rsvp_deadline column to events table');
  }

  const addEventColumn = (name: string, sqlType: string) => {
    const exists = eventColumns.some((col) => col.name === name);
    if (!exists) {
      db.exec(`ALTER TABLE events ADD COLUMN ${name} ${sqlType}`);
      console.log(`✅ Added ${name} column to events table`);
    }
  };

  addEventColumn('location_venue', 'TEXT');
  addEventColumn('location_street', 'TEXT');
  addEventColumn('location_zip_city', 'TEXT');
  addEventColumn('pitch_type', 'TEXT');
  addEventColumn('meeting_point', 'TEXT');
  addEventColumn('arrival_minutes', 'INTEGER');
  addEventColumn('duration_minutes', 'INTEGER');
  addEventColumn('visibility_all', 'INTEGER DEFAULT 1');
  addEventColumn('invite_all', 'INTEGER DEFAULT 1');

  // Add team_picture to teams
  const teamColumns = db.pragma('table_info(teams)') as Array<{ name: string }>;
  const hasTeamPicture = teamColumns.some((col) => col.name === 'team_picture');
  if (!hasTeamPicture) {
    db.exec('ALTER TABLE teams ADD COLUMN team_picture TEXT');
    console.log('✅ Added team_picture column to teams table');
  }

  // Ensure at least one organization exists
  const orgCount = db.prepare('SELECT COUNT(*) as count FROM organizations').get() as { count: number };
  if (orgCount.count === 0) {
    db.prepare(`
      INSERT INTO organizations (name, timezone, setup_completed) 
      VALUES (?, ?, ?)
    `).run('TeamPilot Verein', 'Europe/Berlin', 0);
    console.log('✅ Created default organization');
  }
} catch (error) {
  console.error('Migration error:', error);
}

console.log('✅ Database initialized successfully');

export default db;
