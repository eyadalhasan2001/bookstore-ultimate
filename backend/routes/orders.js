// routes/orders.js
const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
    const { address } = req.body;
    try {
        const cartItems = await pool.query(`SELECT c.*, b.price_physical FROM cart c JOIN books b ON c.book_id = b.id WHERE c.customer_id = $1`, [req.customerId]);
        if (cartItems.rows.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });
        let total = 0;
        cartItems.rows.forEach(item => { total += item.price_physical * item.quantity; });
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        await pool.query(`INSERT INTO orders (order_number, customer_id, total_amount, address) VALUES ($1, $2, $3, $4)`, [orderNumber, req.customerId, total, address]);
        const orderIdRes = await pool.query(`SELECT id FROM orders WHERE order_number = $1`, [orderNumber]);
        const orderId = orderIdRes.rows[0].id;
        for (const item of cartItems.rows) {
            await pool.query(`INSERT INTO order_items (order_id, book_id, quantity, price) VALUES ($1, $2, $3, $4)`, [orderId, item.book_id, item.quantity, item.price_physical]);
        }
        await pool.query(`DELETE FROM cart WHERE customer_id = $1`, [req.customerId]);
        res.json({ success: true, orderNumber });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error placing order' });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`, [req.customerId]);
        res.json({ success: true, orders: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});

module.exports = router;