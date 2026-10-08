const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  sendMessage,
  thread,
  conversations,
  sendValidators
} = require('../controllers/messageController');

const router = express.Router();

router.get('/', protect, conversations);
router.get('/:userId', protect, thread);
router.post('/', protect, sendValidators, sendMessage);

module.exports = router;
