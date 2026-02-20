import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './database/init';
import authRoutes from './routes/auth';
import teamsRoutes from './routes/teams';
import eventsRoutes from './routes/events';
import statsRoutes from './routes/stats';
import invitesRoutes from './routes/invites';
import adminRoutes from './routes/admin';
import profileRoutes from './routes/profile';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'TeamPilot API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      teams: {
        list: 'GET /api/teams',
        create: 'POST /api/teams',
        details: 'GET /api/teams/:id',
        members: 'GET /api/teams/:id/members'
      },
      events: {
        list: 'GET /api/events?team_id=:id',
        create: 'POST /api/events',
        details: 'GET /api/events/:id',
        respond: 'POST /api/events/:id/response'
      },
      stats: {
        team: 'GET /api/stats/team/:id',
        player: 'GET /api/stats/player/:id'
      }
    },
    documentation: 'See README.md for complete API documentation'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', invitesRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
