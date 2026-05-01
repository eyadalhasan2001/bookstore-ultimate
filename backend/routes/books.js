const express = require('express');
const pool = require('../config/database');
const router = express.Router();

router.get('/', async (req, res) => {
    const { search, category, sort, page = 1, limit = 12, lang = 'ar' } = req.query;
    let sql = `SELECT * FROM books WHERE 1=1`;
    let params = [];
    const titleField = lang === 'ar' ? 'title_ar' : 'title';
    if (search) {
        sql += ` AND (${titleField} ILIKE $${params.length + 1} OR author ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }
    if (category && category !== 'all') {
        sql += ` AND category = $${params.length + 1}`;
        params.push(category);
    }
    if (sort === 'price_asc') sql += ` ORDER BY price_physical ASC`;
    else if (sort === 'price_desc') sql += ` ORDER BY price_physical DESC`;
    else sql += ` ORDER BY created_at DESC`;
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const { rows: books } = await pool.query(sql, params);
    const { rows: totalRows } = await pool.query(`SELECT COUNT(*) FROM books`);
    res.json({ success: true, books, total: parseInt(totalRows[0].count) });
});

module.exports = router;