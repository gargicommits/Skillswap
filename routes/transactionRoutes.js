const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { wallet, transactions } = require('../controllers/transactionController');

const router = express.Router();

router.get('/wallet', protect, wallet);
router.get('/transactions', protect, transactions);

module.exports = router;
