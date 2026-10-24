const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createValidators,
  createSwap,
  received,
  sent,
  active,
  accept,
  reject,
  complete
} = require('../controllers/swapController');

const router = express.Router();

router.post('/', protect, createValidators, createSwap);
router.get('/received', protect, received);
router.get('/sent', protect, sent);
router.get('/active', protect, active);
router.put('/:id/accept', protect, accept);
router.put('/:id/reject', protect, reject);
router.put('/:id/complete', protect, complete);

module.exports = router;
