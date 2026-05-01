// add_arabian_data.js
require('dotenv').config();
const { Pool } = require('pg');

// استخدام الرابط من متغير البيئة، مع رابط احتياطي مباشر (للاختبار فقط)
const databaseUrl = process.env.DATABASE_URL || "postgresql://bookstore_db_scte_user:xJGTZByv1I65lmaOrowYROybAlxZhPce@dpg-d7onmvpf9bms73fbi310-a.frankfurt-postgres.render.com/bookstore_db_scte";

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. جداول دور النشر والمؤلفين والكتب العربية
CREATE TABLE IF NOT EXISTS arab_publishers (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    country VARCHAR(100),
    city VARCHAR(100),
    founded_year INTEGER
);

CREATE TABLE IF NOT EXISTS arab_authors (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    birth_year INTEGER,
    death_year INTEGER,
    nationality VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS arab_books (
    id SERIAL PRIMARY KEY,
    title_ar VARCHAR(300) NOT NULL,
    title_en VARCHAR(300),
    author_id INTEGER REFERENCES arab_authors(id),
    publisher_id INTEGER REFERENCES arab_publishers(id),
    publication_year INTEGER NOT NULL,
    category VARCHAR(100),
    price_estimate DECIMAL(10,2),
    description TEXT
);

-- 2. إدراج دور النشر
INSERT INTO arab_publishers (name_ar, name_en, country, city, founded_year) VALUES
('دار الآداب', 'Dar Al Adab', 'لبنان', 'بيروت', 1966),
('دار الساقي', 'Dar Al Saqi', 'لبنان', 'بيروت', 1990),
('الوسط للنشر', 'Al Mutawassit', 'إيطاليا', 'ميلانو', 2002),
('دار التنوير', 'Dar Al Tanweer', 'لبنان', 'بيروت', 2004),
('الدار المصرية اللبنانية', 'Al Dar Al Masriah Al Lubnaniah', 'مصر', 'القاهرة', 1980),
('دار الشروق', 'Dar Al Shorouk', 'مصر', 'القاهرة', 1990),
('دار الهلال', 'Dar Al Hilal', 'مصر', 'القاهرة', 1892),
('الدار العربية للعلوم', 'Dar Al Arabiya', 'لبنان', 'بيروت', 1985),
('كلمات للنشر', 'Kalimat', 'الإمارات', 'الشارقة', 2007),
('دار أدب', 'Dar Adab', 'مصر', 'القاهرة', 2010),
('الكتب خان', 'Al Kotob Khan', 'مصر', 'القاهرة', 1998),
('دار الفارابي', 'Dar Al Farabi', 'لبنان', 'بيروت', 1977),
('الدار الجديدة', 'Dar Al Jadeed', 'لبنان', 'بيروت', 1995),
('الانتشار العربي', 'Al Intishar Al Arabi', 'لبنان', 'بيروت', 2010),
('دار نون', 'Dar Noon', 'مصر', 'القاهرة', 2008),
('رافد للنشر', 'Rafed', 'السعودية', 'الرياض', 2015),
('أداب مشرق', 'Adab Mashreq', 'العراق', 'بغداد', 2002),
('الاختلاف', 'Al Ikhtilaf', 'الجزائر', 'الجزائر', 2005),
('دار الأمل', 'Dar Al Amal', 'المغرب', 'الدار البيضاء', 1985),
('الوراق للنشر', 'Al Warrak', 'الأردن', 'عمان', 2003),
('دار مسكيل', 'Dar Miskal', 'مصر', 'الإسكندرية', 2000),
('المطبوعات الوطنية', 'Al Matbouat Al Watania', 'السعودية', 'جدة', 1980),
('دار الفكر', 'Dar Al Fikr', 'سوريا', 'دمشق', 1950),
('الدار الثقافية', 'Al Dar Al Thaqafiya', 'تونس', 'تونس', 1992),
('المركز الثقافي العربي', 'Arab Cultural Center', 'المغرب', 'الدار البيضاء', 1975),
('منشورات الجمل', 'Al Jamal', 'ألمانيا', 'كولونيا', 1993),
('رياض الريس', 'Riad El Rayyes', 'لبنان', 'بيروت', 1980);

-- 3. إدراج المؤلفين
INSERT INTO arab_authors (name_ar, name_en, birth_year, death_year, nationality) VALUES
('نجيب محفوظ', 'Naguib Mahfouz', 1911, 2006, 'مصري'),
('الطيب صالح', 'Tayeb Salih', 1929, 2009, 'سوداني'),
('غسان كنفاني', 'Ghassan Kanafani', 1936, 1972, 'فلسطيني'),
('محمود درويش', 'Mahmoud Darwish', 1941, 2008, 'فلسطيني'),
('أحلام مستغانمي', 'Ahlam Mosteghanemi', 1953, NULL, 'جزائرية'),
('إلياس خوري', 'Elias Khoury', 1948, NULL, 'لبناني'),
('عبد الرحمن منيف', 'Abdul Rahman Munif', 1933, 2004, 'سعودي'),
('علاء الأسواني', 'Alaa Al Aswany', 1957, NULL, 'مصري'),
('جبران خليل جبران', 'Khalil Gibran', 1883, 1931, 'لبناني'),
('يوسف زيدان', 'Youssef Ziedan', 1958, NULL, 'مصري'),
('إبراهيم نصر الله', 'Ibrahim Nasrallah', 1954, NULL, 'فلسطيني'),
('بهاء طاهر', 'Bahaa Taher', 1935, 2022, 'مصري'),
('ميرال الطحاوي', 'Miral Al Tahawy', 1968, NULL, 'مصرية'),
('هدى بركات', 'Hoda Barakat', 1952, NULL, 'لبنانية'),
('أحمد سعداوي', 'Ahmed Saadawi', 1973, NULL, 'عراقي'),
('محمد حسن علوان', 'Mohamed Hasan Alwan', 1979, NULL, 'سعودي'),
('إبراهيم الكوني', 'Ibrahim Al Koni', 1948, NULL, 'ليبي'),
('حجي جابر', 'Haji Jaber', 1976, NULL, 'قطري'),
('منصورة عز الدين', 'Mansoura Ez Eldin', 1976, NULL, 'مصرية');

-- 4. إدراج الكتب (مختصر)
INSERT INTO arab_books (title_ar, title_en, author_id, publisher_id, publication_year, category, price_estimate, description) VALUES
('ثلاثية القاهرة', 'The Cairo Trilogy', 1, 5, 2003, 'رواية', 45.00, 'ثلاثية نجيب محفوظ الحائزة على نوبل'),
('موسم الهجرة إلى الشمال', 'Season of Migration to the North', 2, 1, 1992, 'رواية', 20.00, 'أهم رواية سودانية في القرن العشرين'),
('رجال في الشمس', 'Men in the Sun', 3, 1, 1993, 'رواية', 15.00, 'رواية فلسطينية عن اللجوء'),
('ذاكرة الجسد', 'Memory in the Flesh', 5, 2, 1993, 'رواية', 30.00, 'أول رواية لأحلام مستغانمي'),
('باب الشمس', 'Gate of the Sun', 6, 3, 1998, 'رواية', 25.00, 'رواية عن النكبة الفلسطينية'),
('مدن الملح', 'Cities of Salt', 7, 5, 1984, 'رواية', 50.00, 'خماسية عن النفط وتغير المجتمعات'),
('عمارة يعقوبيان', 'The Yacoubian Building', 8, 6, 2002, 'رواية', 18.00, 'رواية عن المجتمع المصري'),
('النبي', 'The Prophet', 9, 1, 1998, 'أدب', 15.00, 'كتاب جبران خليل جبران الأشهر'),
('عزازيل', 'Azazeel', 10, 5, 2008, 'رواية', 22.00, 'رواية حائزة على جائزة البوكر العربية'),
('زمن الخيول البيضاء', 'Time of White Horses', 11, 6, 2007, 'رواية', 28.00, 'رواية عن الثورة الفلسطينية'),
('أرض الله', 'Land of God', 12, 1, 2004, 'رواية', 18.00, 'رواية بهاء طاهر'),
('الخيمة', 'The Tent', 13, 1, 1998, 'رواية', 16.00, 'رواية ميرال الطحاوي الأولى'),
('فرانكشتاين في بغداد', 'Frankenstein in Baghdad', 15, 5, 2013, 'رواية', 22.00, 'رواية حائزة على جائزة البوكر'),
('موت صغير', 'A Small Death', 16, 6, 2016, 'رواية', 25.00, 'رواية عن حياة محيي الدين بن عربي'),
('بريد الليل', 'The Night Mail', 17, 1, 2017, 'رواية', 18.00, 'رواية عن الحرب في اليمن'),
('حرب الكلب الثانية', 'The Second War of the Dog', 18, 2, 2019, 'رواية', 24.00, 'رواية عن الصحراء والسلطة'),
('درس المبارزة', 'The Fencing Lesson', 19, 7, 2021, 'رواية', 22.00, 'رواية عن امرأة مصرية في أوروبا');

SELECT '✅ جميع البيانات تمت إضافتها بنجاح' as status;
`;

async function runMigration() {
    try {
        console.log('🔄 جاري الاتصال بقاعدة البيانات...');
        await pool.query(sql);
        console.log('✅ تم إنشاء الجداول وإضافة البيانات بنجاح!');
    } catch (err) {
        console.error('❌ حدث خطأ:', err.message);
    } finally {
        await pool.end();
    }
}

runMigration();