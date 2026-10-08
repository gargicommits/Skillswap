const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Skill = require('../models/Skill');
const SwapRequest = require('../models/SwapRequest');
const { sanitizeUser, computeMatch, escapeRegex } = require('../utils/helpers');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Please upload an image file (jpg, png, gif, or webp)'));
  }
});

const updateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be 500 characters or less'),
  body('location').optional().trim().isLength({ max: 120 })
];

function withMatch(me, user) {
  const data = sanitizeUser(user);
  if (!me) {
    data.matchPercent = 0;
    return data;
  }
  data.matchPercent = computeMatch(me, user).percent;
  return data;
}

async function getMe(req, res) {
  res.json({ success: true, user: sanitizeUser(req.user) });
}

async function updateMe(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, username, bio, location } = req.body;
    if (username && username.toLowerCase() !== req.user.username) {
      const taken = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user._id } });
      if (taken) {
        return res.status(409).json({ success: false, message: 'Username already exists' });
      }
      req.user.username = username.toLowerCase();
    }
    if (name !== undefined) req.user.name = name;
    if (bio !== undefined) req.user.bio = bio;
    if (location !== undefined) req.user.location = location;

    await req.user.save();
    const updated = await User.findById(req.user._id).populate('skillsToTeach').populate('skillsToLearn');
    res.json({ success: true, message: 'Profile saved', user: sanitizeUser(updated) });
  } catch (error) {
    next(error);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a profile picture' });
    }
    req.user.profileImage = `/uploads/${req.file.filename}`;
    await req.user.save();
    const updated = await User.findById(req.user._id).populate('skillsToTeach').populate('skillsToLearn');
    res.json({ success: true, message: 'Photo updated', user: sanitizeUser(updated) });
  } catch (error) {
    next(error);
  }
}

async function addSkill(req, res, next) {
  try {
    const { skillId, list } = req.body;
    if (!skillId || !['teach', 'learn'].includes(list)) {
      return res.status(400).json({ success: false, message: 'Please select a skill' });
    }
    const skill = await Skill.findById(skillId);
    if (!skill) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }

    const field = list === 'teach' ? 'skillsToTeach' : 'skillsToLearn';
    const other = list === 'teach' ? 'skillsToLearn' : 'skillsToTeach';
    if (req.user[field].some((s) => String(s._id || s) === String(skillId))) {
      return res.status(400).json({ success: false, message: 'You already added this skill' });
    }
    req.user[other] = req.user[other].filter((s) => String(s._id || s) !== String(skillId));
    req.user[field].push(skillId);
    await req.user.save();
    const updated = await User.findById(req.user._id).populate('skillsToTeach').populate('skillsToLearn');
    res.json({ success: true, message: 'Skill added', user: sanitizeUser(updated) });
  } catch (error) {
    next(error);
  }
}

async function removeSkill(req, res, next) {
  try {
    const { list } = req.query;
    const { skillId } = req.params;
    if (!['teach', 'learn'].includes(list)) {
      return res.status(400).json({ success: false, message: 'Please select a skill' });
    }
    const field = list === 'teach' ? 'skillsToTeach' : 'skillsToLearn';
    req.user[field] = req.user[field].filter((s) => String(s._id || s) !== String(skillId));
    await req.user.save();
    const updated = await User.findById(req.user._id).populate('skillsToTeach').populate('skillsToLearn');
    res.json({ success: true, message: 'Skill removed', user: sanitizeUser(updated) });
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const { search = '', category = '', skill = '', rating = '', location = '' } = req.query;
    const and = [];
    if (req.user) and.push({ _id: { $ne: req.user._id } });

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      const skills = await Skill.find({ name: rx }).select('_id');
      and.push({
        $or: [
          { name: rx },
          { username: rx },
          { bio: rx },
          { location: rx },
          { skillsToTeach: { $in: skills.map((s) => s._id) } },
          { skillsToLearn: { $in: skills.map((s) => s._id) } }
        ]
      });
    }

    if (location) {
      and.push({ location: new RegExp(escapeRegex(location), 'i') });
    }

    if (rating) {
      and.push({ rating: { $gte: Number(rating) } });
    }

    if (skill) {
      and.push({ $or: [{ skillsToTeach: skill }, { skillsToLearn: skill }] });
    }

    if (category) {
      const catSkills = await Skill.find({ category }).select('_id');
      const ids = catSkills.map((s) => s._id);
      and.push({
        $or: [{ skillsToTeach: { $in: ids } }, { skillsToLearn: { $in: ids } }]
      });
    }

    const filter = and.length ? { $and: and } : {};

    const users = await User.find(filter)
      .select('-password')
      .populate('skillsToTeach')
      .populate('skillsToLearn');

    const payload = users
      .map((u) => withMatch(req.user, u))
      .sort((a, b) => b.matchPercent - a.matchPercent);

    res.json({ success: true, users: payload });
  } catch (error) {
    next(error);
  }
}

async function matches(req, res, next) {
  try {
    const others = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .populate('skillsToTeach')
      .populate('skillsToLearn');

    const payload = others
      .map((u) => withMatch(req.user, u))
      .filter((u) => u.matchPercent > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, 8);

    res.json({ success: true, users: payload });
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('skillsToTeach')
      .populate('skillsToLearn');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: withMatch(req.user, user) });
  } catch (error) {
    next(error);
  }
}

async function stats(req, res, next) {
  try {
    const activeSwaps = await SwapRequest.countDocuments({
      status: 'accepted',
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    });
    res.json({
      success: true,
      stats: {
        credits: req.user.credits,
        teaching: req.user.skillsToTeach.length,
        learning: req.user.skillsToLearn.length,
        activeSwaps,
        completedSwaps: req.user.completedSwaps,
        rating: req.user.rating
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  upload,
  updateValidators,
  getMe,
  updateMe,
  uploadAvatar,
  addSkill,
  removeSkill,
  listUsers,
  matches,
  getUser,
  stats
};
