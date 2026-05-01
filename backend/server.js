// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_change_this';

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== Database ====================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ==================== Create Tables ====================
const createTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            price_physical REAL NOT NULL,
            category TEXT,
            cover_icon TEXT,
            stock_physical INTEGER DEFAULT 0,
            rating_avg REAL DEFAULT 0,
            featured INTEGER DEFAULT 0
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
            address TEXT,
            status TEXT DEFAULT 'pending'
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id),
            book_id INTEGER,
            quantity INTEGER,
            price REAL
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS wishlist (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            book_id INTEGER REFERENCES books(id),
            UNIQUE(customer_id, book_id)
        );
    `);
    console.log('✅ All tables created');
};

// ==================== Default Data ====================
const initDefaultData = async () => {
    // Demo user
    const demoExists = await pool.query(`SELECT * FROM customers WHERE email = 'user@bookstore.com'`);
    if (demoExists.rows.length === 0) {
        const hashed = await bcrypt.hash('user123', 10);
        await pool.query(`INSERT INTO customers (email, password_hash) VALUES ($1, $2)`, ['user@bookstore.com', hashed]);
        console.log('✅ Demo user: user@bookstore.com / user123');
    }
    // Admin user
    const adminExists = await pool.query(`SELECT * FROM customers WHERE email = 'admin@bookstore.com'`);
    if (adminExists.rows.length === 0) {
        const hashed = await bcrypt.hash('admin123', 10);
        await pool.query(`INSERT INTO customers (email, password_hash, role) VALUES ($1, $2, $3)`, ['admin@bookstore.com', hashed, 'admin']);
        console.log('✅ Admin user: admin@bookstore.com / admin123');
    }
    // Sample books
    const booksCount = await pool.query(`SELECT COUNT(*) FROM books`);
    if (parseInt(booksCount.rows[0].count) === 0) {
        const sampleBooks = [
            { title: 'الأب الغني والأب الفقير', author: 'روبرت كيوساكي', price_physical: 45, category: 'تطوير ذات', cover_icon: '💰', stock_physical: 50, featured: 1, rating_avg: 4.5 },
            { title: 'العادات السبع للناس الأكثر فعالية', author: 'ستيفن كوفي', price_physical: 55, category: 'تطوير ذات', cover_icon: '📚', stock_physical: 40, featured: 1, rating_avg: 4.8 },
            { title: 'مئة عام من العزلة', author: 'غابرييل غارسيا ماركيز', price_physical: 65, category: 'روايات', cover_icon: '📖', stock_physical: 30, featured: 1, rating_avg: 4.9 }
        ];
        for (const book of sampleBooks) {
            await pool.query(`
                INSERT INTO books (title, author, price_physical, category, cover_icon, stock_physical, featured, rating_avg)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [book.title, book.author, book.price_physical, book.category, book.cover_icon, book.stock_physical, book.featured, book.rating_avg]);
        }
        console.log('✅ Sample books added');
    }
};

// ==================== Auth Middleware ====================
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.customerId = decoded.id;
        next();
    } catch {
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

// ==================== API Routes ====================
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing required fields' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query(`INSERT INTO customers (email, password_hash) VALUES ($1, $2)`, [email, hashed]);
        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already exists' });
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await pool.query(`SELECT * FROM customers WHERE email = $1`, [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, SECRET_KEY, { expiresIn: '30d' });
        res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/me', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT id, email, role FROM customers WHERE id = $1`, [req.customerId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/books', async (req, res) => {
    const { search, category, sort, page = 1, limit = 12, lang = 'ar' } = req.query;
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
    else if (sort === 'rating') sql += ` ORDER BY rating_avg DESC`;
    else sql += ` ORDER BY featured DESC, id DESC`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    try {
        const { rows: books } = await pool.query(sql, params);
        const { rows: countResult } = await pool.query(`SELECT COUNT(*) as total FROM books`);
        res.json({ success: true, books, total: parseInt(countResult[0].total) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.get('/api/books/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM books WHERE id = $1`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Book not found' });
        res.json({ success: true, book: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Cart
app.get('/api/cart', authenticate, async (req, res) => {
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

app.post('/api/cart/add', authenticate, async (req, res) => {
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

app.put('/api/cart/update/:id', authenticate, async (req, res) => {
    const { quantity } = req.body;
    try {
        await pool.query(`UPDATE cart SET quantity = $1 WHERE id = $2 AND customer_id = $3`, [quantity, req.params.id, req.customerId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating cart' });
    }
});

app.delete('/api/cart/remove/:id', authenticate, async (req, res) => {
    try {
        await pool.query(`DELETE FROM cart WHERE id = $1 AND customer_id = $2`, [req.params.id, req.customerId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error removing from cart' });
    }
});

// Wishlist
app.get('/api/wishlist', authenticate, async (req, res) => {
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

app.post('/api/wishlist/add', authenticate, async (req, res) => {
    const { bookId } = req.body;
    try {
        await pool.query(`INSERT INTO wishlist (customer_id, book_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.customerId, bookId]);
        res.json({ success: true, message: 'Added to wishlist' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error adding to wishlist' });
    }
});

app.delete('/api/wishlist/remove/:bookId', authenticate, async (req, res) => {
    try {
        await pool.query(`DELETE FROM wishlist WHERE customer_id = $1 AND book_id = $2`, [req.customerId, req.params.bookId]);
        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error removing from wishlist' });
    }
});

// Orders
app.post('/api/orders', authenticate, async (req, res) => {
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
        const pointsEarned = Math.floor(total / 10);
        await pool.query(`UPDATE customers SET points = points + $1 WHERE id = $2`, [pointsEarned, req.customerId]);
        await pool.query(`DELETE FROM cart WHERE customer_id = $1`, [req.customerId]);
        res.json({ success: true, orderNumber, pointsEarned });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error placing order' });
    }
});

app.get('/api/orders', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`, [req.customerId]);
        res.json({ success: true, orders: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});

// Categories
app.get('/api/categories', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT DISTINCT category as name FROM books WHERE category IS NOT NULL`);
        const categories = rows.map(r => r.name);
        res.json({ success: true, categories });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
});

// ==================== Serve Frontend ====================
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// ==================== Start Server ====================
createTables().then(() => {
    initDefaultData().then(() => {
        app.listen(PORT, () => {
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║     📚 BookStore Ultimate is running on port ${PORT}        ║`);
            console.log(`╠════════════════════════════════════════════════════════════╣`);
            console.log(`║  📖 API: http://localhost:${PORT}/api/books                   ║`);
            console.log(`║  👤 Demo: user@bookstore.com / user123                       ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
        });
    });
}).catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
});