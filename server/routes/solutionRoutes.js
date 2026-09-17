const express = require('express');
const path = require('node:path');
const multer = require('multer');
const { SolutionRepository, progressMap, ChallengeRepository } = require('../models/schema');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `solution_${Date.now()}_${basename}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

function isValidHttpUrl(string) {
  if (!string) return true;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

router.post('/', verifyToken, requireRole(['Student / Innovator', 'Admin / Reviewer']), upload.array('evidence', 5), async (req, res) => {
  try {
    const {
      challengeId,
      problemId,
      solutionTitle,
      solutionDescription,
      technology,
      team,
      status,
      impact,
      website,
      source,
      demo,
      submissionType
    } = req.body;

    if (!challengeId) {
      return res.status(400).json({ success: false, message: 'A challengeId is required to submit a solution.' });
    }

    const challenge = await ChallengeRepository.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    if (!solutionTitle || !solutionDescription) {
      return res.status(400).json({ success: false, message: 'Solution title and description are required.' });
    }

    const effectiveStatus = submissionType === 'review' ? 'Ready for Review' : (status || 'Proposed');

    if (website && !isValidHttpUrl(website)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid website URL starting with http:// or https://' });
    }

    if (effectiveStatus === 'Ready for Review' && !website) {
      return res.status(400).json({
        success: false,
        message: 'A complete live public Website URL is required before submitting for review.'
      });
    }

    const existingSolution = await SolutionRepository.findByChallengeAndAuthor(challengeId, req.user.id);
    if (existingSolution) {
      return res.status(200).json({
        success: true,
        reused: true,
        message: 'You already submitted a solution for this challenge. Reusing your existing submission.',
        solution: existingSolution
      });
    }

    const evidenceFiles = req.files ? req.files.map(f => f.filename) : [];
    const solutionId = `sol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newSolution = await SolutionRepository.createSolution({
      id: solutionId,
      challengeId,
      problemId: problemId || challenge.problemId || null,
      authorId: req.user.id,
      authorName: req.user.fullName,
      authorRole: req.user.role,
      title: solutionTitle.trim(),
      description: solutionDescription.trim(),
      technology: (technology || '').trim(),
      team: (team || '').trim(),
      impact: (impact || '').trim(),
      status: effectiveStatus,
      websiteUrl: (website || '').trim(),
      sourceCodeUrl: (source || '').trim(),
      demoUrl: (demo || '').trim(),
      evidenceFiles
    });

    res.status(201).json({
      success: true,
      reused: false,
      message: effectiveStatus === 'Ready for Review'
        ? 'Complete Project Submitted Successfully for Review.'
        : 'Solution Proposal Submitted Successfully.',
      solution: newSolution
    });
  } catch (err) {
    console.error('Submit solution error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit solution.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { challengeId, authorId, status } = req.query;
    const solutions = await SolutionRepository.findAll({ challengeId, authorId, status });
    res.json({ success: true, count: solutions.length, solutions });
  } catch (err) {
    console.error('Fetch solutions error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve solutions.' });
  }
});

router.get('/my', verifyToken, async (req, res) => {
  try {
    const { challengeId, status } = req.query;
    const solutions = await SolutionRepository.findAll({
      challengeId,
      status,
      authorId: req.user.id
    });
    res.json({ success: true, count: solutions.length, solutions });
  } catch (err) {
    console.error('Fetch own solutions error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve your solutions.' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const solution = await SolutionRepository.findById(req.params.id);
    if (!solution) {
      return res.status(404).json({ success: false, message: 'Solution not found.' });
    }
    if (req.user.role !== 'Admin / Reviewer' && solution.authorId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this solution.' });
    }
    res.json({ success: true, solution });
  } catch (err) {
    console.error('Fetch solution error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve solution details.' });
  }
});

router.patch('/:id', verifyToken, requireRole(['Student / Innovator', 'Admin / Reviewer']), async (req, res) => {
  try {
    const current = await SolutionRepository.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Solution not found.' });
    }
    if (req.user.role !== 'Admin / Reviewer' && current.authorId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not allowed to edit this solution.' });
    }

    const fields = {
      title: String(req.body.solutionTitle || req.body.title || '').trim(),
      description: String(req.body.solutionDescription || req.body.description || '').trim(),
      technology: String(req.body.technology || '').trim(),
      team: String(req.body.team || '').trim(),
      impact: String(req.body.impact || '').trim(),
      websiteUrl: String(req.body.website || req.body.websiteUrl || '').trim(),
      sourceCodeUrl: String(req.body.source || req.body.sourceCodeUrl || '').trim(),
      demoUrl: String(req.body.demo || req.body.demoUrl || '').trim()
    };

    if (!fields.title || !fields.description) {
      return res.status(400).json({ success: false, message: 'Solution title and description are required.' });
    }
    if (![fields.websiteUrl, fields.sourceCodeUrl, fields.demoUrl].every(isValidHttpUrl)) {
      return res.status(400).json({ success: false, message: 'All provided project URLs must start with http:// or https://.' });
    }

    const solution = await SolutionRepository.updateSolution(req.params.id, fields, req.user);
    res.json({ success: true, solution });
  } catch (err) {
    console.error('Update solution error:', err);
    res.status(500).json({ success: false, message: 'Failed to update solution.' });
  }
});

router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, websiteUrl, reviewerNotes } = req.body;
    if (!progressMap[status]) {
      return res.status(400).json({ success: false, message: 'Invalid status provided.' });
    }

    const current = await SolutionRepository.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Solution not found.' });
    }

    const isOwner = current.authorId === req.user.id;
    const isReviewer = req.user.role === 'Admin / Reviewer';
    if (!isOwner && !isReviewer) {
      return res.status(403).json({ success: false, message: 'You are not allowed to update this solution.' });
    }

    if (status === 'Ready for Review') {
      const targetWebsite = websiteUrl || current?.websiteUrl;
      if (!targetWebsite || !isValidHttpUrl(targetWebsite)) {
        return res.status(400).json({
          success: false,
          message: 'Please add and save a valid complete public Website URL before marking this project as Ready for Review.'
        });
      }
    }

    const updated = await SolutionRepository.updateStatus(req.params.id, status, websiteUrl, req.user, reviewerNotes || '');
    res.json({
      success: true,
      message: `Project status updated to "${status}" (${updated.progressPercent}% complete).`,
      solution: updated
    });
  } catch (err) {
    console.error('Update solution status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update solution status.' });
  }
});

module.exports = router;
