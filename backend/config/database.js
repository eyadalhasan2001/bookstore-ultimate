const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const createTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            featured INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cart (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            book_id INTEGER REFERENCES books(id),
            quantity INTEGER DEFAULT 1,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            order_number TEXT UNIQUE,
            customer_id INTEGER REFERENCES customers(id),
            total_amount REAL,
            address TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            UNIQUE(customer_id, book_id),
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('✅ All tables created');
};

// ✅ فقط إنشاء حساب المسؤول (بدون أي مستخدمين أو كتب تجريبية)
const initAdmin = async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bookstore.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existing = await pool.query(`SELECT * FROM customers WHERE email = $1`, [adminEmail]);
    if (existing.rows.length === 0) {
        const hashed = await bcrypt.hash(adminPassword, 10);
        await pool.query(
            `INSERT INTO customers (email, password_hash, full_name) VALUES ($1, $2, $3)`,
            [adminEmail, hashed, 'System Administrator']
        );
        console.log(`✅ Admin user created: ${adminEmail} / ${adminPassword}`);
    } else {
        console.log(`✅ Admin user already exists: ${adminEmail}`);
    }
};

module.exports = { pool, createTables, initAdmin };