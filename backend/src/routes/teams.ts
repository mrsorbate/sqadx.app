import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../database/init';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CreateTeamDTO } from '../types';

const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for team picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'team-' + uniqueSuffix + path.extname(file.originalname));
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
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get all teams for current user
router.get('/', (req: AuthRequest, res) => {
  try {
    const teams = db.prepare(`
      SELECT t.*, tm.role as my_role
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
      ORDER BY t.name
    `).all(req.user!.id);

    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team details
router.get('/:id', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    
    // Check if user is member
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(teamId, req.user!.id);

    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create team (admin only)
router.post('/', (req: AuthRequest, res) => {
  try {
    const { name, description }: CreateTeamDTO = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create teams' });
    }

    const stmt = db.prepare(
      'INSERT INTO teams (name, description, created_by) VALUES (?, ?, ?)'
    );
    const result = stmt.run(name, description, req.user!.id);

    // Team is created without members - admin will assign trainers via admin panel

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      description,
      created_by: req.user!.id
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get team members
router.get('/:id/members', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);

    // Check membership
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(teamId, req.user!.id);

    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone_number, u.birth_date, tm.role, tm.jersey_number, tm.position, tm.joined_at
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY tm.role, u.name
    `).all(teamId);

    res.json(members);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Add team member
router.post('/:id/members', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { user_id, role = 'player', jersey_number, position } = req.body;

    // Check if user is trainer
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(teamId, req.user!.id) as any;

    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can add members' });
    }

    // Check if user exists
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add member
    const stmt = db.prepare(
      'INSERT INTO team_members (team_id, user_id, role, jersey_number, position) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(teamId, user_id, role, jersey_number, position);

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

// Create new player (trainer only)
router.post('/:id/players', async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { name, birth_date, jersey_number } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Check if user is trainer of this team
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(teamId, req.user!.id) as any;

    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can create players' });
    }

    // Generate unique token
    const crypto = require('crypto');
    const token = crypto.randomBytes(16).toString('hex');

    // Create invite with player info
    const stmt = db.prepare(
      'INSERT INTO team_invites (team_id, token, role, created_by, player_name, player_birth_date, player_jersey_number, max_uses) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(teamId, token, 'player', req.user!.id, name, birth_date || null, jersey_number || null, 1);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const inviteUrl = `${frontendUrl}/invite/${token}`;

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      birth_date,
      jersey_number,
      token,
      invite_url: inviteUrl
    });
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// Upload team picture (trainers only)
router.post('/:id/picture', upload.single('picture') as any, (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);

    // Check if user is trainer of this team
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(teamId, req.user!.id) as any;

    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can upload team pictures' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Delete old picture if exists
    const oldTeam = db.prepare('SELECT team_picture FROM teams WHERE id = ?').get(teamId) as any;
    if (oldTeam?.team_picture) {
      const oldPath = path.join(uploadsDir, path.basename(oldTeam.team_picture));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update team with new picture path
    const picturePath = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE teams SET team_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(picturePath, teamId);

    res.json({ team_picture: picturePath });
  } catch (error) {
    console.error('Upload team picture error:', error);
    res.status(500).json({ error: 'Failed to upload team picture' });
  }
});

export default router;

