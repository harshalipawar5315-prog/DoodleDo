const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/stats — get XP and streak for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      xp: user.xp,
      streak: user.streak,
      lastActiveDate: user.lastActiveDate
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/stats — update XP and streak
router.post('/', auth, async (req, res) => {
  try {
    const { xp, streak, lastActiveDate } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { xp, streak, lastActiveDate },
      { new: true }
    ).select('-password');
    res.json({
      xp: user.xp,
      streak: user.streak,
      lastActiveDate: user.lastActiveDate
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;