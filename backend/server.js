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

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== Database Connection ====================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ==================== Create Tables (Simplified) ====================
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

// ==================== Default Data (Compatible) ====================
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
                INSERT INTO books (title, author, price_physical, category, cover