// routes/wishlist.js
const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT w.book_id, b.title, b.price_physical, b.cover_icon
             FROM wishlist w JOIN books b ON w.book_id = b.id WHERE w.customer_id = $1`,
            [req.customerId]
        );
        res.json({ success: true, wishlist: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching wishlist' });
    }
});

router.post('/add', authenticate, async (req, res) => {
    const { bookId } = req.body;
    try {
        await pool.query(`INSERT INTO wishlist (customer_id, book_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.customerId, bookId]);
        res.json({ success: true, message: 'Added to wishlist' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error adding to wishlist' });
    }
});

router.delete('/remove/:bookId', authenticate, async (req, res) => {
    try {
        await pool.query(`DELETE FROM wishlist WHERE customer_id = $1 AND book_id = $2`, [req.customerId, req.params.bookId]);
        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error removing from wishlist' });
    }
});

module.exports = router;