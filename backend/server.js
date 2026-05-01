// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createTables, initDefaultData } = require('./config/database');

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

// Routes
app.use('/api', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

createTables().then(() => {
    initDefaultData().then(() => {
        app.listen(PORT, () => {
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║     📚 BookStore Ultimate is running on port ${PORT}        ║`);
            console.log(`╠════════════════════════════════════════════════════════════╣`);
            console.log(`║  📖 API: http://localhost:${PORT}/api/books                   ║`);
            console.log(`║  👤 Demo: user@bookstore.com / user123                       ║`);
            console.log(`║  👑 Admin: admin@bookstore.com / admin123                    ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
        });
    });
}).catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
});