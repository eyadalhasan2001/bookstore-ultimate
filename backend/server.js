require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createTables, initAdmin } = require('./config/database'); // ✅ استدعاء initAdmin

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const wishlistRoutes = require('./routes/wishlist');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

createTables().then(async () => {
    await initAdmin();  // ✅ فقط إنشاء المسؤول
    app.listen(PORT, () => {
        console.log(`\n╔════════════════════════════════════════════════════════════╗`);
        console.log(`║     📚 BookStore Ultimate is running on port ${PORT}        ║`);
        console.log(`╠════════════════════════════════════════════════════════════╣`);
        console.log(`║  👤 Admin: ${process.env.ADMIN_EMAIL || 'admin@bookstore.com'} / ${process.env.ADMIN_PASSWORD || 'admin123'} ║`);
        console.log(`║  🛡️ Customer registration with captcha enabled             ║`);
        console.log(`║  📦 Sellers need admin approval                            ║`);
        console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    });
}).catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
});