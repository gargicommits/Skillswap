const Transaction = require('../models/Transaction');
function wallet(req, res) {
  // protectWallet has already loaded the account. Do not make the balance
  // depend on a second user lookup or the slower, independent history query.
  res.json({
    success: true,
    credits: req.user.credits,
    user: { name: req.user.name, credits: req.user.credits }
  });
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
