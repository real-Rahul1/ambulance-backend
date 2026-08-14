const express = require('express');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes below require a valid admin JWT
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — list all registered users with sharing status + last known location
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// GET /api/admin/users/:id — single user's details + last known location
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

module.exports = router;
