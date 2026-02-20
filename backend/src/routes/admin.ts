import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/init';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// First-time setup endpoint (no auth required)
// This creates the first admin user and completes organization setup
router.post('/first-setup', async (req, res) => {
  try {
    const { organizationName, adminUsername, adminEmail, adminPassword, timezone } = req.body;

    // Validate input
    if (!organizationName || !adminUsername || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Organization name, username, email and password are required' });
    }

    const normalizedUsername = String(adminUsername).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3-30 chars and can only contain letters, numbers and underscores' });
    }

    if (adminPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if setup has already been completed
    const org = db.prepare('SELECT setup_completed FROM organizations WHERE id = 1').get() as any;
    if (org?.setup_completed === 1) {
      return res.status(403).json({ error: 'Setup has already been completed' });
    }

    // Check if admin already exists
    const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
    if (existingAdmin) {
      return res.status(403).json({ error: 'Admin already exists' });
    }

    // Check if username or email is already used
    const existingUsername = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(normalizedUsername);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const userStmt = db.prepare(
      'INSERT INTO users (username, email, password, name, role) VALUES (?, ?, ?, ?, ?)'
    );
    const userResult = userStmt.run(normalizedUsername, adminEmail, hashedPassword, 'Admin', 'admin');

    // Update organization
    db.prepare(`
      UPDATE organizations 
      SET name = ?, timezone = ?, setup_completed = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(organizationName, timezone || 'Europe/Berlin');

    // Generate token
    const token = jwt.sign(
      { id: userResult.lastInsertRowid, username: normalizedUsername, email: adminEmail, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: userResult.lastInsertRowid,
        username: normalizedUsername,
        email: adminEmail,
        name: 'Admin',
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('First-time setup error:', error);
    res.status(500).json({ error: 'Setup failed' });
  }
});

// All routes below require authentication
router.use(authenticate);

// Middleware to check admin role
const requireAdmin = (req: AuthRequest, res: any, next: any) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.use(requireAdmin);

// Get all teams (admin only)
router.get('/teams', (req: AuthRequest, res) => {
  try {
    const teams = db.prepare(`
      SELECT 
        t.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      INNER JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
    `).all();

    res.json(teams);
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get all users (admin only)
router.get('/users', (req: AuthRequest, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        (SELECT COUNT(*) FROM team_members WHERE user_id = u.id) as team_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Add user to team (admin only)
router.post('/teams/:teamId/members', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { user_id, role = 'player', jersey_number, position } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Check if team exists
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add member
    const stmt = db.prepare(
      'INSERT INTO team_members (team_id, user_id, role, jersey_number, position) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(teamId, user_id, role, jersey_number, position);

    // Create pending responses for all upcoming events
    const upcomingEvents = db.prepare(
      'SELECT id FROM events WHERE team_id = ? AND start_time >= datetime("now")'
    ).all(teamId) as any[];

    const responseStmt = db.prepare(
      'INSERT INTO event_responses (event_id, user_id, status) VALUES (?, ?, ?)'
    );

    for (const event of upcomingEvents) {
      responseStmt.run(event.id, user_id, 'pending');
    }

    res.status(201).json({
      id: result.lastInsertRowid,
      team_id: teamId,
      user_id,
      role,
      jersey_number,
      position
    });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'User is already a team member' });
    }
    console.error('Add team member error:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Delete team (admin only)
router.delete('/teams/:id', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);

    const result = db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Remove user from team (admin only)
router.delete('/teams/:teamId/members/:userId', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = parseInt(req.params.userId);

    const result = db.prepare(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?'
    ).run(teamId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// Get organization settings
router.get('/settings', (req: AuthRequest, res) => {
  try {
    const org = db.prepare('SELECT * FROM organizations LIMIT 1').get();
    res.json(org);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Complete setup wizard
router.post('/settings/setup', (req: AuthRequest, res) => {
  try {
    const { organizationName, timezone } = req.body;

    if (!organizationName) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    db.prepare(`
      UPDATE organizations 
      SET name = ?, timezone = ?, setup_completed = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(organizationName, timezone || 'Europe/Berlin');

    const org = db.prepare('SELECT * FROM organizations WHERE id = 1').get();
    res.json(org);
  } catch (error) {
    console.error('Setup wizard error:', error);
    res.status(500).json({ error: 'Failed to complete setup' });
  }
});

// Delete organization and all related data (admin only)
router.delete('/organization', (req: AuthRequest, res) => {
  try {
    const currentOrg = db.prepare('SELECT name FROM organizations WHERE id = 1').get() as any;

    db.prepare('DELETE FROM team_members').run();
    db.prepare('DELETE FROM event_responses').run();
    db.prepare('DELETE FROM events').run();
    db.prepare('DELETE FROM team_invites').run();
    db.prepare('DELETE FROM teams').run();
    db.prepare('DELETE FROM users').run();

    db.prepare(`
      UPDATE organizations
      SET name = ?, logo = NULL, timezone = 'Europe/Berlin', setup_completed = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run('Neuer Verein');

    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.warn('Failed to remove upload file during organization reset:', filePath, cleanupError);
        }
      }
    }

    res.json({
      success: true,
      message: `Organization "${currentOrg?.name || 'Unbekannt'}" and all related data deleted. Setup reset required.`
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// Upload organization logo (special handling for file upload with explicit middleware order)
router.post('/settings/logo', 
  authenticate,
  (req: AuthRequest, res, next) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },
  upload.single('logo') as any,
  (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const logoPath = `/uploads/${req.file.filename}`;
    
    // Delete old logo file if exists
    const oldOrg = db.prepare('SELECT logo FROM organizations WHERE id = 1').get() as any;
    if (oldOrg?.logo) {
      const oldFilePath = path.join(uploadsDir, path.basename(oldOrg.logo));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    db.prepare(`
      UPDATE organizations 
      SET logo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(logoPath);

    const org = db.prepare('SELECT * FROM organizations WHERE id = 1').get();
    res.json(org);
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

export default router;
