const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { sanitizeUser, avatarUrl } = require('../utils/helpers');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Username can only contain letters, numbers, dots and underscores'),
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('erpId').optional().trim(),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
];

const loginValidators = [
  body('identifier').trim().notEmpty().withMessage('Email, username, or ERP ID is required'),
  body('password').notEmpty().withMessage('Password is required')
];

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, username, email, password, erpId } = req.body;
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const assignedErp = erpId?.trim().toUpperCase() || `ERP${Math.floor(100000 + Math.random() * 900000)}`;

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashed,
      erpId: assignedErp,
      isErpVerified: true,
      credits: 100,
      profileImage: avatarUrl(name)
    });

    await Transaction.create({
      user: user._id,
      amount: 100,
      type: 'welcome_bonus',
      description: 'Welcome bonus (ERP Verified)'
    });

    const token = signToken(user._id);
    const populated = await User.findById(user._id).populate('skillsToTeach').populate('skillsToLearn');

    res.status(201).json({
      success: true,
      message: 'Account created with ERP verification',
      token,
      user: sanitizeUser(populated)
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { identifier, password } = req.body;
    const cleanId = identifier.trim();
    let query;

    if (cleanId.includes('@')) {
      query = { email: cleanId.toLowerCase() };
    } else {
      query = {
        $or: [
          { username: cleanId.toLowerCase() },
          { erpId: cleanId.toUpperCase() },
          { erpId: cleanId }
        ]
      };
    }

    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or ERP ID not found' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or password' });
    }

    const token = signToken(user._id);
    const populated = await User.findById(user._id).populate('skillsToTeach').populate('skillsToLearn');

    res.json({
      success: true,
      message: 'Logged in successfully via ERP verification',
      token,
      user: sanitizeUser(populated)
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json({ success: true, user: sanitizeUser(req.user) });
}

module.exports = { register, login, me, registerValidators, loginValidators };
