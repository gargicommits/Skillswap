const express = require('express');
const { register, login, me, registerValidators, loginValidators } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerValidators, register);
router.post('/login', loginValidators, login);
router.get('/me', protect, me);

module.exports = router;
