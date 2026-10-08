const Transaction = require('../models/Transaction');
const User = require('../models/User');

async function wallet(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('credits name');
    res.json({
      success: true,
      credits: user.credits,
      user: { name: user.name, credits: user.credits }
    });
  } catch (error) {
    next(error);
  }
}

async function transactions(req, res, next) {
  try {
    const items = await Transaction.find({ user: req.user._id })
      .populate('relatedUser', 'name username profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, transactions: items });
  } catch (error) {
    next(error);
  }
}

module.exports = { wallet, transactions };
