const express = require('express');
const { protectWallet } = require('../middleware/authMiddleware');
const { wallet, transactions } = require('../controllers/transactionController');

const router = express.Router();

router.get('/wallet', protectWallet, wallet);
router.get('/transactions', protectWallet, transactions);

module.exports = router;
