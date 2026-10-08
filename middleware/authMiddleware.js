const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
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

module.exports = { protect, optionalAuth };
