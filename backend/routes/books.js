// routes/books.js
const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

router.get('/', async (req, res) => {
    const { search, category, sort, page = 1, limit = 12 } = req.query;
    let sql = `SELECT * FROM books WHERE 1=1`;
    let params = [];
    if (search) {
        sql += ` AND (title ILIKE $${params.length + 1} OR author ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }
    if (category && category !== 'all') {
        sql += ` AND category = $${params.length + 1}`;
        params.push(category);
    }
    if (sort === 'price_asc') sql += ` ORDER BY price_physical ASC`;
    else if (sort === 'price_desc') sql += ` ORDER BY price_physical DESC`;
    else sql += ` ORDER BY featured DESC, id DESC`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    try {
        const { rows: books } = await pool.query(sql, params);
        const { rows: countResult } = await pool.query(`SELECT COUNT(*) as total FROM books`);
        res.json({ success: true, books, total: parseInt(countResult[0].total) });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM books WHERE id = $1`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Book not found' });
        res.json({ success: true, book: rows[0] });
    } catch {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

router.get('/categories/list', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT DISTINCT category as name FROM books WHERE category IS NOT NULL`);
        const categories = rows.map(r => r.name);
        res.json({ success: true, categories });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
});

module.exports = router;