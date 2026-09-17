const express = require('express');
const { ChallengeRepository } = require('../models/schema');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const challenges = await ChallengeRepository.findAll({ category, search });
    res.json({ success: true, count: challenges.length, challenges });
  } catch (err) {
    console.error('Fetch challenges error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve challenges.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const challenge = await ChallengeRepository.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    res.json({ success: true, challenge });
  } catch (err) {
    console.error('Fetch challenge error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve challenge details.' });
  }
});

router.post('/', verifyToken, requireRole(['Admin / Reviewer', 'Authority / Organization']), async (req, res) => {
  try {
    const { title, category, problem, challengeQuestion, skills, expectedImpact, problemId } = req.body;
    if (!title || !problem || !category) {
      return res.status(400).json({ success: false, message: 'Title, category, and problem description are required.' });
    }

    const duplicate = await ChallengeRepository.findDuplicate({
      title: title.trim(),
      problem: problem.trim(),
      category: category.trim()
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'A similar challenge already exists. Duplicate challenge creation is not allowed.'
      });
    }

    const id = `chl_${Date.now().toString(36)}`;
    const newChallenge = await ChallengeRepository.createChallenge({
      id,
      problemId: problemId || null,
      title: title.trim(),
      category: category.trim(),
      problem: problem.trim(),
      challengeQuestion: (challengeQuestion || '').trim(),
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
      expectedImpact: (expectedImpact || '').trim(),
      watchersCount: 0,
      featured: false,
      authorName: req.user.fullName,
      authorRole: req.user.role
    });

    res.status(201).json({ success: true, challenge: newChallenge });
  } catch (err) {
    console.error('Create challenge error:', err);
    res.status(500).json({ success: false, message: 'Failed to create challenge.' });
  }
});

router.post('/:id/watch', verifyToken, requireRole(['Student / Innovator', 'Admin / Reviewer']), async (req, res) => {
  try {
    const result = await ChallengeRepository.toggleWatch(req.params.id, req.user.id);
    if (!result.challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    res.json({
      success: true,
      watched: result.watched,
      watchersCount: result.challenge.watchersCount,
      message: result.watched ? 'Challenge saved to your workspace.' : 'Challenge removed from saved list.'
    });
  } catch (err) {
    console.error('Toggle watch error:', err);
    res.status(500).json({ success: false, message: 'Failed to update watch status.' });
  }
});

module.exports = router;
