const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('token');
let cart = [];

async function loadBooks() {
    const search = document.getElementById('searchInput').value;
    let url = API_URL + '/books?page=1&limit=12';
    if (search) url += '&search=' + encodeURIComponent(search);
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) displayBooks(data.books);
        else document.getElementById('booksGrid').innerHTML = '<p>لا توجد كتب</p>';
    } catch (e) {
        document.getElementById('booksGrid').innerHTML = '<p style="color:red">❌ لا يمكن الاتصال بالخادم</p>';
    }
}

function displayBooks(books) {
    const grid = document.getElementById('booksGrid');
    if (!books.length) { grid.innerHTML = '<p>لا توجد كتب</p>'; return; }
    grid.innerHTML = '';
    books.forEach(book => {
        grid.innerHTML += `
            <div class="book-card">
                <div class="book-title">${book.title_ar || book.title}</div>
                <div class="book-author">${book.author}</div>
                <div class="book-price">${book.price_physical} د.ل</div>
                <button class="btn" onclick="addToCart(${book.id})">➕ أضف</button>
            </div>
        `;
    });
}

async function addToCart(bookId) {
    if (!token) { alert('يرجى تسجيل الدخول أولاً'); openLoginModal(); return; }
    const res = await fetch(API_URL + '/cart/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ bookId, quantity: 1 })
    });
    if (res.ok) { alert('تمت الإضافة'); loadCart(); }
}

async function loadCart() {
    if (!token) return;
    const res = await fetch(API_URL + '/cart', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    if (data.success) {
        cart = data.cart;
        document.getElementById('cartCount').innerText = cart.reduce((s, i) => s + i.quantity, 0);
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const res = await fetch(API_URL + '/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
        token = data.token; localStorage.setItem('token', token);
        alert('تم تسجيل الدخول');
        closeLoginModal(); loadBooks(); loadCart();
    } else alert('بيانات غير صحيحة');
}

async function register() {
    const userData = {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        phone: document.getElementById('regPhone').value,
        address: document.getElementById('regAddress').value
    };
    const res = await fetch(API_URL + '/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (data.success) {
        alert('تم التسجيل بنجاح، يمكنك الدخول الآن');
        closeRegisterModal(); openLoginModal();
    } else alert(data.message);
}

async function checkout() {
    if (!token) { alert('يرجى تسجيل الدخول'); openLoginModal(); return; }
    const address = prompt('أدخل عنوان الشحن:');
    if (!address) return;
    const res = await fetch(API_URL + '/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ address })
    });
    const data = await res.json();
    if (data.success) {
        alert(`تم إتمام الطلب بنجاح! نقاط مكتسبة: ${data.pointsEarned}`);
        closeCart(); loadCart();
    } else alert(data.message);
}

function openLoginModal() { document.getElementById('loginModal').style.display = 'flex'; }
function closeLoginModal() { document.getElementById('loginModal').style.display = 'none'; }
function openRegisterModal() { document.getElementById('registerModal').style.display = 'flex'; }
function closeRegisterModal() { document.getElementById('registerModal').style.display = 'none'; }
function openCart() { document.getElementById('cartSidebar').style.display = 'flex'; loadCart(); }
function closeCart() { document.getElementById('cartSidebar').style.display = 'none'; }
function searchBooks() { loadBooks(); }

loadBooks();