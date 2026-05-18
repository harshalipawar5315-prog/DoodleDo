const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Get token from request header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // No token = not logged in
  if (!token) {
    return res.status(401).json({ message: 'No token, access denied' });
  }

  try {
    // Verify the token is valid and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next(); // allow request to continue
  } catch (err) {
    res.status(401).json({ message: 'Token is invalid' });
  }
};