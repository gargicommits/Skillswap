const express = require('express');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/userController');

const router = express.Router();

router.get('/me', protect, getMe);
router.put('/me', protect, updateValidators, updateMe);
router.post('/me/avatar', protect, upload.single('profileImage'), uploadAvatar);
router.post('/me/skills', protect, addSkill);
router.delete('/me/skills/:skillId', protect, removeSkill);
router.get('/matches', protect, matches);
router.get('/stats', protect, stats);
router.get('/', optionalAuth, listUsers);
router.get('/:id', optionalAuth, getUser);

module.exports = router;
