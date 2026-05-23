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
      lastActiveDate: user.lastActiveDate,
      quotes: user.quotes,
      customVibes: user.customVibes
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/stats — update XP, streak, and settings
router.post('/', auth, async (req, res) => {
  try {
    const { xp, streak, lastActiveDate, quotes, customVibes } = req.body;
    
    // Create an update object with only defined fields
    const updateData = { xp, streak, lastActiveDate };
    if (quotes !== undefined) updateData.quotes = quotes;
    if (customVibes !== undefined) updateData.customVibes = customVibes;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');
    res.json({
      xp: user.xp,
      streak: user.streak,
      lastActiveDate: user.lastActiveDate,
      quotes: user.quotes,
      customVibes: user.customVibes
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;