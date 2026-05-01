const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '€Ì— „’—Õ' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch {
        return res.status(403).json({ success: false, message: ' Êﬂ‰ €Ì— ’«·Õ' });
    }
};