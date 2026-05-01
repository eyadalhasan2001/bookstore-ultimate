const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
    const { address } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows: cartItems } = await client.query(
            `SELECT c.book_id, c.quantity, b.price_physical
             FROM cart c JOIN books b ON c.book_id = b.id WHERE c.user_id = $1`, [req.userId]);
        if (!cartItems.length) throw new Error('empty');
        let total = 0;
        cartItems.forEach(i => total += i.price_physical * i.quantity);
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const { rows: orderRes } = await client.query(
            `INSERT INTO orders (order_number, user_id, total, address) VALUES ($1,$2,$3,$4) RETURNING id`,
            [orderNumber, req.userId, total, address]);
        const orderId = orderRes[0].id;
        for (const it of cartItems) {
            await client.query(`INSERT INTO order_items (order_id, book_id, quantity, price) VALUES ($1,$2,$3,$4)`,
                [orderId, it.book_id, it.quantity, it.price_physical]);
            await client.query(`UPDATE books SET stock_physical = stock_physical - $1 WHERE id = $2`, [it.quantity, it.book_id]);
        }
        await client.query(`DELETE FROM cart WHERE user_id = $1`, [req.userId]);
        const pointsEarned = Math.floor(total / 10);
        await client.query(`UPDATE users SET points = points + $1 WHERE id = $2`, [pointsEarned, req.userId]);
        await client.query('COMMIT');
        res.json({ success: true, orderNumber, pointsEarned });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: e.message === 'empty' ? 'ÇáÓáÉ ÝÇÑÛÉ' : 'ÎØÃ Ýí ÅäÔÇÁ ÇáØáÈ' });
    } finally { client.release(); }
});

router.get('/', auth, async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`, [req.userId]);
    res.json({ success: true, orders: rows });
});

module.exports = router;