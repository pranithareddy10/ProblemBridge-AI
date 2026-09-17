const express = require('express');
const { StatsRepository } = require('../models/schema');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const stats = await StatsRepository.getOverview(req.query);
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve platform stats.' });
  }
});

module.exports = router;
