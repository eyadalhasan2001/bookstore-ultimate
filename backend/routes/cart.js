const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
    const { rows } = await pool.query(
        `SELECT c.id, c.book_id, c.quantity, b.title, b.price_physical, b.cover_icon
         FROM cart c JOIN books b ON c.book_id = b.id WHERE c.user_id = $1`,
        [req.userId]);
    let total = 0;
    rows.forEach(i => total += i.price_physical * i.quantity);
    res.json({ success: true, cart: rows, total });
});

router.post('/add', auth, async (req, res) => {
    const { bookId, quantity = 1 } = req.body;
    await pool.query(
        `INSERT INTO cart (user_id, book_id, quantity) VALUES ($1,$2,$3)
         ON CONFLICT (user_id, book_id) DO UPDATE SET quantity = cart.quantity + $3`,
        [req.userId, bookId, quantity]);
    res.json({ success: true });
});

router.put('/update/:id', auth, async (req, res) => {
    const { quantity } = req.body;
    await pool.query(`UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3`, [quantity, req.params.id, req.userId]);
    res.json({ success: true });
});

router.delete('/remove/:id', auth, async (req, res) => {
    await pool.query(`DELETE FROM cart WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    res.json({ success: true });
});

module.exports = router;