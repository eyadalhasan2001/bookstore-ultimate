const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'ÌãíÚ ÇáÍÞæá ãØáæÈÉ' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query(`INSERT INTO users (name, email, password_hash, phone, address) VALUES ($1,$2,$3,$4,$5)`,
            [name, email, hashed, phone || '', address || '']);
        res.json({ success: true, message: 'Êã ÇáÊÓÌíá ÈäÌÇÍ' });
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ success: false, message: 'ÇáÈÑíÏ ãæÌæÏ ãÓÈÞÇð' });
        res.status(500).json({ success: false, message: 'ÎØÃ Ýí ÇáÎÇÏã' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'ÈíÇäÇÊ ÛíÑ ÕÍíÍÉ' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'ÈíÇäÇÊ ÛíÑ ÕÍíÍÉ' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, points: user.points || 0 } });
});

router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.json({ success: false, user: null });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { rows } = await pool.query(`SELECT id, name, email, phone, address, points, role FROM users WHERE id = $1`, [decoded.id]);
        res.json({ success: true, user: rows[0] || null });
    } catch { res.json({ success: false, user: null }); }
});

module.exports = router;