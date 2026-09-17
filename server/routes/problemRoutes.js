const express = require('express');
const path = require('node:path');
const multer = require('multer');
const { ProblemRepository, ChallengeRepository } = require('../models/schema');
const { optionalAuth, verifyToken, requireRole } = require('../middleware/auth');
const { analyzeProblem } = require('../services/aiService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `evidence_${Date.now()}_${basename}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/analyze', async (req, res) => {
  try {
    const { title, description, category, location } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Please provide both title and description for AI analysis.' });
    }

    const analysis = await analyzeProblem({
      title: title.trim(),
      description: description.trim(),
      category: category || 'Healthcare',
      location: (location || 'Not provided').trim()
    });

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('AI analysis error:', err);
    res.status(500).json({ success: false, message: 'Failed to process AI analysis.' });
  }
});

router.post('/', optionalAuth, upload.single('evidence'), async (req, res) => {
  try {
    const { title, description, category, location, contact } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Problem title and description are required.' });
    }

    if (req.user && req.user.role !== 'Citizen' && req.user.role !== 'Admin / Reviewer') {
      return res.status(403).json({ success: false, message: 'Only citizens can submit problem reports.' });
    }

    const evidenceUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const analysis = await analyzeProblem({
      title: title.trim(),
      description: description.trim(),
      category: category || 'Healthcare',
      location: (location || 'Not provided').trim()
    });

    const problemId = `prb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const authorId = req.user ? req.user.id : null;
    const authorName = req.user ? req.user.fullName : 'Anonymous Citizen';

    const problemData = {
      id: problemId,
      title: title.trim(),
      description: description.trim(),
      category: category || 'Healthcare',
      location: (location || 'Not provided').trim(),
      evidenceUrl,
      contact: (contact || '').trim(),
      authorId,
      authorName,
      route: analysis.route,
      urgency: analysis.urgency,
      score: analysis.score,
      duplicate: analysis.duplicate,
      recurring: analysis.recurring,
      similarReports: analysis.similarReports,
      assignedAuthority: analysis.assignedAuthority,
      recommendation: analysis.recommendation,
      peopleAffected: analysis.peopleAffected,
      innovationPotential: analysis.innovationPotential,
      rootCauses: analysis.rootCauses,
      techSuggestions: analysis.techSuggestions,
      authorityStatus: analysis.route === 'authority' || analysis.route === 'dual'
        ? 'Forwarded to Concerned Authority'
        : 'AI Analysis Completed',
      citizenVerification: '',
      supportCount: analysis.duplicate ? 19 : 1,
      reviewerStatus: '',
      lastUpdatedBy: ''
    };

    const savedProblem = await ProblemRepository.createProblem(problemData);

    let createdChallenge = null;
    if (analysis.route === 'innovation' || analysis.route === 'dual') {
      const challengeId = `chl_${Date.now().toString(36)}`;
      createdChallenge = await ChallengeRepository.createChallenge({
        id: challengeId,
        problemId: savedProblem.id,
        title: savedProblem.title,
        category: savedProblem.category,
        problem: savedProblem.description,
        challengeQuestion: analysis.challengeQuestion,
        skills: analysis.techSuggestions.slice(0, 4),
        expectedImpact: `Resolving this challenge addresses critical community needs in ${savedProblem.location}.`,
        watchersCount: 1,
        featured: false,
        authorName: authorName || 'System',
        authorRole: req.user ? req.user.role : 'Citizen'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Problem report submitted and analyzed successfully.',
      problem: savedProblem,
      analysis,
      challenge: createdChallenge
    });
  } catch (err) {
    console.error('Problem creation error:', err);
    res.status(500).json({ success: false, message: 'Server error while submitting problem report.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category, route, search, limit, offset, status, citizenVerification } = req.query;
    const problems = await ProblemRepository.findAll({
      category,
      route,
      search,
      status,
      citizenVerification,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });

    res.json({ success: true, count: problems.length, problems });
  } catch (err) {
    console.error('Fetch problems error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve problems.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const problem = await ProblemRepository.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem report not found.' });
    }
    res.json({ success: true, problem });
  } catch (err) {
    console.error('Fetch problem error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve problem details.' });
  }
});

router.post('/:id/support', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await ProblemRepository.incrementSupport(req.params.id, userId);

    if (!result.problem) {
      return res.status(404).json({ success: false, message: 'Problem report not found.' });
    }

    res.json({
      success: true,
      message: result.alreadySupported
        ? 'You have already supported this report. Your support remains active.'
        : 'Thank you! Your support has been counted, reinforcing the priority of this report.',
      alreadySupported: result.alreadySupported,
      supportCount: result.problem.supportCount,
      problem: result.problem
    });
  } catch (err) {
    console.error('Support problem error:', err);
    res.status(500).json({ success: false, message: 'Failed to add support.' });
  }
});

router.patch('/:id/authority-status', verifyToken, requireRole(['Authority / Organization', 'Admin / Reviewer']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      'Forwarded to Concerned Authority',
      'Authority Reviewing',
      'Work Assigned',
      'Resolution in Progress',
      'Resolved'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid authority status specified.' });
    }

    const updated = await ProblemRepository.updateAuthorityStatus(req.params.id, status, req.user);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Problem report not found.' });
    }

    res.json({
      success: true,
      message: `Status updated to "${status}".`,
      problem: updated
    });
  } catch (err) {
    console.error('Update authority status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update authority status.' });
  }
});

router.post('/:id/verify', verifyToken, async (req, res) => {
  try {
    const { answer } = req.body;
    if (!['yes', 'no'].includes(answer)) {
      return res.status(400).json({ success: false, message: 'Answer must be "yes" or "no".' });
    }

    const problem = await ProblemRepository.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem report not found.' });
    }

    if (req.user.role !== 'Citizen' && req.user.role !== 'Admin / Reviewer') {
      return res.status(403).json({ success: false, message: 'Only citizens or reviewers can verify problem resolution.' });
    }

    if (problem.authorId && req.user.id !== problem.authorId && req.user.role !== 'Admin / Reviewer') {
      return res.status(403).json({ success: false, message: 'You are not authorized to verify this problem report.' });
    }

    const updated = await ProblemRepository.updateCitizenVerification(req.params.id, answer, req.user);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Problem report not found.' });
    }

    if (answer === 'no') {
      await ProblemRepository.updateAuthorityStatus(req.params.id, 'Resolution in Progress', req.user);
    }

    const finalProblem = await ProblemRepository.findById(req.params.id);
    res.json({
      success: true,
      message: answer === 'yes'
        ? 'Thank you! Problem marked as Citizen Verified Resolved.'
        : 'The problem has been marked as still unresolved and escalated back to the authority.',
      citizenVerification: answer,
      problem: finalProblem
    });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit citizen verification.' });
  }
});

module.exports = router;
