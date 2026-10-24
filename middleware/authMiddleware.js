const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }

  try {
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('skillsToTeach')
      .populate('skillsToLearn');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Database errors are server failures, not invalid sessions. Returning 401
    // here makes the client erase a valid token during a temporary DB outage.
    next(error);
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return next();
    try {
      const user = await User.findById(decoded.id)
        .select('-password')
        .populate('skillsToTeach')
        .populate('skillsToLearn');
      if (user) req.user = user;
    } catch (_) {
      /* ignore */
    }
    next();
  });
}

async function protectWallet(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }

  try {
    // Wallet requests only need account identity and credits. Avoid populating
    // the user's skill lists on every balance or transaction-history request.
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { protect, protectWallet, optionalAuth };
