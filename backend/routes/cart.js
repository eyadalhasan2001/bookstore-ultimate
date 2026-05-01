// routes/cart.js
const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.id, c.book_id, b.title, b.price_physical, c.quantity
             FROM cart c JOIN books b ON c.book_id = b.id WHERE c.customer_id = $1`,
            [req.customerId]
        );
        let total = 0;
        rows.forEach(item => { total += item.price_physical * item.quantity; });
        res.json({ success: true, cart: rows, total });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching cart' });
    }
});

router.post('/add', authenticate, async (req, res) => {
    const { bookId, quantity = 1 } = req.body;
    try {
        const existing = await pool.query(`SELECT * FROM cart WHERE customer_id = $1 AND book_id = $2`, [req.customerId, bookId]);
        if (existing.rows.length > 0) {
            await pool.query(`UPDATE cart SET quantity = quantity + $1 WHERE id = $2`, [quantity, existing.rows[0].id]);
        } else {
            await pool.query(`INSERT INTO cart (customer_id, book_id, quantity) VALUES ($1, $2, $3)`, [req.customerId, bookId, quantity]);
        }
        res.json({ success: true, message: 'Added to cart' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error adding to cart' });
    }
});

router.put('/update/:id', authenticate, async (req, res) => {
    const { quantity } = req.body;
    try {
        await pool.query(`UPDATE cart SET quantity = $1 WHERE id = $2 AND customer_id = $3`, [quantity, req.params.id, req.customerId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating cart' });
    }
});

router.delete('/remove/:id', authenticate, async (req, res) => {
    try {
        await pool.query(`DELETE FROM cart WHERE id = $1 AND customer_id = $2`, [req.params.id, req.customerId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error removing from cart' });
    }
});

module.exports = router;