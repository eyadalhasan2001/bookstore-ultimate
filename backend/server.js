const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const wishlistRoutes = require('./routes/wishlist');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const { initDatabase } = require('./utils/initDb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'عدد الطلبات كثير، حاول لاحقاً' }
});
app.use('/api/', limiter);

app.use('/api', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'index.html'));
});

app.use(errorHandler);

initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\n╔════════════════════════════════════════════════════════════╗`);
        console.log(`║     📚 BookStore Ultimate is running on port ${PORT}        ║`);
        console.log(`╠════════════════════════════════════════════════════════════╣`);
        console.log(`║  📖 API: http://localhost:${PORT}/api/books                   ║`);
        console.log(`║  👤 Demo: user@bookstore.com / user123                       ║`);
        console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    });
}).catch(err => {
    console.error('❌ فشل في تهيئة قاعدة البيانات:', err);
    process.exit(1);
});