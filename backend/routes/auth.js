// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_change_this';

router.post('/register', async (req, res) => {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing required fields' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query(`INSERT INTO customers (email, password_hash, full_name) VALUES ($1, $2, $3)`, [email, hashed, full_name || 'ãÓÊÎÏã ÌÏíÏ']);
        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already exists' });
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await pool.query(`SELECT * FROM customers WHERE email = $1`, [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '30d' });
        res.json({ success: true, token, user: { id: user.id, email: user.email, full_name: user.full_name } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const { rows } = await pool.query(`SELECT id, email, full_name FROM customers WHERE id = $1`, [decoded.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user: rows[0] });
    } catch {
        res.status(403).json({ success: false, message: 'Invalid token' });
    }
});

module.exports = router;