const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

const isAdmin = async (req, res, next) => {
    const { rows } = await pool.query(`SELECT role FROM users WHERE id = $1`, [req.userId]);
    if (!rows.length || rows[0].role !== 'admin') return res.status(403).json({ success: false, message: 'ÛíÑ ãÕÑÍ' });
    next();
};

router.post('/books', auth, isAdmin, async (req, res) => {
    const { title, title_ar, author, price_physical, category, cover_icon } = req.body;
    await pool.query(
        `INSERT INTO books (title, title_ar, author, price_physical, category, cover_icon)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [title, title_ar, author, price_physical, category, cover_icon]);
    res.json({ success: true });
});

router.get('/stats', auth, isAdmin, async (req, res) => {
    const books = await pool.query(`SELECT COUNT(*) FROM books`);
    const users = await pool.query(`SELECT COUNT(*) FROM users`);
    const orders = await pool.query(`SELECT COUNT(*) FROM orders`);
    res.json({ success: true, stats: { books: books.rows[0].count, users: users.rows[0].count, orders: orders.rows[0].count } });
});

module.exports = router;