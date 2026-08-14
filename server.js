require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5500';

// ---- Middleware ----
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

// ---- REST routes ----
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ---- Socket.io ----
const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN, credentials: true }
});

// Authenticate every socket connection using the same JWT issued by /api/auth
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token provided'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { id, role }
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const { id, role } = socket.user;

  if (role === 'admin') {
    // Admin dashboard listens for updates from all users
    socket.join('admins');
    console.log('Admin connected:', socket.id);
    return;
  }

  // A regular user connected — mark them as sharing and notify admins
  console.log('User connected:', id, socket.id);

  User.findByIdAndUpdate(id, { isSharing: true }).catch((err) =>
    console.error('Failed to set isSharing true:', err.message)
  );

  io.to('admins').emit('user:online', { userId: id });

  // User's browser sends periodic { lat, lng, accuracy } pings
  socket.on('location:update', async (payload) => {
    const { lat, lng, accuracy } = payload || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const updatedAt = new Date();

    try {
      await User.findByIdAndUpdate(id, {
        lastLocation: { lat, lng, accuracy: accuracy ?? null, updatedAt }
      });
    } catch (err) {
      console.error('Failed to save location:', err.message);
    }

    io.to('admins').emit('location:update', {
      userId: id,
      lat,
      lng,
      accuracy: accuracy ?? null,
      updatedAt
    });
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', id, socket.id);
    try {
      await User.findByIdAndUpdate(id, { isSharing: false });
    } catch (err) {
      console.error('Failed to set isSharing false:', err.message);
    }
    io.to('admins').emit('user:offline', { userId: id });
  });
});

// ---- Start server ----
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
