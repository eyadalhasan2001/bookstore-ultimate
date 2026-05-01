const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                points INTEGER DEFAULT 0,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                title_ar TEXT,
                author TEXT NOT NULL,
                price_physical REAL NOT NULL,
                old_price REAL,
                category TEXT,
                cover_icon TEXT,
                description TEXT,
                stock_physical INTEGER DEFAULT 0,
                rating REAL DEFAULT 0,
                featured INTEGER DEFAULT 0,
                bestseller INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS cart (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                quantity INTEGER DEFAULT 1,
                UNIQUE(user_id, book_id)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number TEXT UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id),
                total REAL NOT NULL,
                address TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id),
                book_id INTEGER REFERENCES books(id),
                quantity INTEGER NOT NULL,
                price REAL NOT NULL
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS wishlist (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                book_id INTEGER REFERENCES books(id),
                UNIQUE(user_id, book_id)
            )
        `);
        // add sample user if not exists
        const { rows } = await client.query(`SELECT id FROM users WHERE email = 'user@bookstore.com'`);
        if (!rows.length) {
            const hashed = await bcrypt.hash('user123', 10);
            await client.query(
                `INSERT INTO users (name, email, password_hash, points) VALUES ('مستخدم تجريبي', 'user@bookstore.com', $1, 100)`,
                [hashed]);
            console.log('✅ مستخدم تجريبي: user@bookstore.com / user123');
        }
        const { rows: booksCount } = await client.query(`SELECT COUNT(*) FROM books`);
        if (booksCount[0].count === 0) {
            await client.query(`
                INSERT INTO books (title, title_ar, author, price_physical, old_price, category, cover_icon, description, stock_physical, featured, bestseller, rating)
                VALUES 
                ('Rich Dad Poor Dad', 'الأب الغني والأب الفقير', 'Robert Kiyosaki', 45, 60, 'Self Development', '💰', 'كتاب في التمويل الشخصي', 50, 1, 1, 4.5),
                ('The 7 Habits', 'العادات السبع', 'Stephen Covey', 55, 75, 'Self Development', '📚', 'تطوير الذات', 40, 1, 1, 4.8),
                ('One Hundred Years of Solitude', 'مئة عام من العزلة', 'Gabriel Garcia Marquez', 65, NULL, 'Novels', '📖', 'رواية عالمية', 30, 1, 0, 4.9),
                ('The Alchemist', 'الخيميائي', 'Paulo Coelho', 40, NULL, 'Novels', '🏜️', 'رواية ملهمة', 45, 1, 0, 4.7)
            `);
            console.log('✅ تم إضافة كتب افتراضية');
        }
        console.log('✅ قاعدة البيانات مهيأة');
    } catch (err) { console.error(err); throw err; }
    finally { client.release(); }
}
module.exports = { initDatabase };