const express = require('express');
const bcrypt = require('bcryptjs');
const { UserRepository } = require('../models/schema');
const { signToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

const validRoles = [
  'Citizen',
  'Student / Innovator',
  'Authority / Organization',
  'Admin / Reviewer'
];

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role, mobileNumber } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide full name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const assignedRole = validRoles.includes(role) ? role : 'Citizen';

    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser = await UserRepository.createUser({
      id: userId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: assignedRole,
      mobileNumber: (mobileNumber || '').trim()
    });

    const token = signToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        mobileNumber: newUser.mobileNumber,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (role && role !== user.role) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as ${user.role}. Select that role to continue.`
      });
    }

    const token = signToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mobileNumber: user.mobileNumber,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Get current user profile
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
