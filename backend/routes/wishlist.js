const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
    const { rows } = await pool.query(
        `SELECT w.book_id, b.title, b.price_physical
         FROM wishlist w JOIN books b ON w.book_id = b.id WHERE w.user_id = $1`, [req.userId]);
    res.json({ success: true, wishlist: rows });
});

router.post('/add', auth, async (req, res) => {
    const { bookId } = req.body;
    await pool.query(`INSERT INTO wishlist (user_id, book_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.userId, bookId]);
    res.json({ success: true });
});

router.delete('/remove/:bookId', auth, async (req, res) => {
    await pool.query(`DELETE FROM wishlist WHERE user_id = $1 AND book_id = $2`, [req.userId, req.params.bookId]);
    res.json({ success: true });
});

module.exports = router;