// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_change_this');
        req.customerId = decoded.id;
        next();
    } catch {
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = { authenticate };