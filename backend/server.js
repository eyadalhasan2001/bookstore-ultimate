require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// ==================== قاعدة البيانات PostgreSQL ====================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// إنشاء الجداول تلقائياً
const createTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            city TEXT,
            country TEXT DEFAULT 'Saudi Arabia',
            language TEXT DEFAULT 'ar',
            currency TEXT DEFAULT 'SAR',
            loyalty_points INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            title_ar TEXT,
            isbn13 TEXT UNIQUE,
            price_physical REAL NOT NULL,
            price_digital REAL,
            stock_physical INTEGER DEFAULT 0,
            stock_digital INTEGER DEFAULT 999,
            publisher_id INTEGER,
            rating_avg REAL DEFAULT 0
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cart (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            book_id INTEGER REFERENCES books(id),
            quantity INTEGER DEFAULT 1
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            order_number TEXT UNIQUE,
            customer_id INTEGER REFERENCES customers(id),
            total_amount REAL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE,
            discount REAL,
            expires_at TIMESTAMP
        );
    `);
    console.log('✅ جميع الجداول تم إنشاؤها (PostgreSQL)');
};

// ==================== دوال المساعدة ====================
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'غير مصرح' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.id;
        next();
    } catch {
        return res.status(403).json({ success: false, message: 'توكن غير صالح' });
    }
};

// ==================== API ====================
// تسجيل حساب جديد
app.post('/api/register', async (req, res) => {
    const { full_name, email, password, phone, address } = req.body;
    if (!full_name || !email || !password) {
        return res.status(400).json({ success: false, message: 'جميع الحقول الأساسية مطلوبة' });
    }
    try {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO customers (full_name, email, password_hash, phone, address) VALUES ($1, $2, $3, $4, $5)`,
            [full_name, email, hashed, phone || '', address || '']
        );
        res.json({ success: true, message: 'تم التسجيل بنجاح' });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ success: false, message: 'البريد موجود مسبقاً' });
        console.error(err);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await pool.query(`SELECT * FROM customers WHERE email = $1`, [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ success: false, message: 'بيانات غير صحيحة' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, message: 'بيانات غير صحيحة' });
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '30d' });
        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.full_name, email: user.email, points: user.loyalty_points || 0 }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// جلب بيانات المستخدم الحالي
app.get('/api/me', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT id, full_name as name, email, phone, address, loyalty_points as points FROM customers WHERE id = $1`, [req.userId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'مستخدم غير موجود' });
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// جلب الكتب
app.get('/api/books', async (req, res) => {
    const { search, sort, page = 1, limit = 12 } = req.query;
    let sql = `SELECT * FROM books WHERE 1=1`;
    let params = [];
    if (search) {
        sql += ` AND (title ILIKE $${params.length + 1} OR title_ar ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }
    if (sort === 'price_asc') sql += ` ORDER BY price_physical ASC`;
    else if (sort === 'price_desc') sql += ` ORDER BY price_physical DESC`;
    else sql += ` ORDER BY id DESC`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    try {
        const { rows: books } = await pool.query(sql, params);
        const { rows: countResult } = await pool.query(`SELECT COUNT(*) as total FROM books`);
        res.json({ success: true, books, total: parseInt(countResult[0].total) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
    }
});

// إضافة إلى السلة
app.post('/api/cart/add', authenticate, async (req, res) => {
    const { bookId, quantity = 1 } = req.body;
    try {
        await pool.query(
            `INSERT INTO cart (customer_id, book_id, quantity) VALUES ($1, $2, $3)
             ON CONFLICT (customer_id, book_id) DO UPDATE SET quantity = cart.quantity + $3`,
            [req.userId, bookId, quantity]
        );
        res.json({ success: true, message: 'تمت الإضافة إلى السلة' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'خطأ في الإضافة' });
    }
});

// جلب السلة
app.get('/api/cart', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.id, c.book_id, b.title, b.title_ar, b.price_physical, c.quantity
             FROM cart c JOIN books b ON c.book_id = b.id WHERE c.customer_id = $1`,
            [req.userId]
        );
        let total = 0;
        rows.forEach(item => { total += item.price_physical * item.quantity; });
        res.json({ success: true, cart: rows, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'خطأ في جلب السلة' });
    }
});

// حذف من السلة
app.delete('/api/cart/remove/:id', authenticate, async (req, res) => {
    try {
        await pool.query(`DELETE FROM cart WHERE id = $1 AND customer_id = $2`, [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في الحذف' });
    }
});

// ==================== خدمة الملفات الثابتة (Frontend) ====================
app.use(express.static(path.join(__dirname, '../frontend')));

// جميع الطرق غير المعرفة تعرض ملف index.html (لـ SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// ==================== بدء الخادم ====================
createTables().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📖 API: http://localhost:${PORT}/api/books`);
    });
}).catch(err => {
    console.error('❌ فشل إنشاء الجداول:', err);
});