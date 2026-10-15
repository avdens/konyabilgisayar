-- KONYA BİLGİSAYAR - STOK, ALIM/SATIM VE CARİ TAKİP SİSTEMİ
-- Database Schema

PRAGMA foreign_keys = ON;

-- 1. KULLANICILAR
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. CARİLER (Müşteri & Tedarikçi Tek Çatı Altında)
CREATE TABLE IF NOT EXISTS cariler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('customer', 'supplier', 'both')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    tc_vkn TEXT,
    tax_office TEXT,
    city TEXT DEFAULT 'Konya',
    district TEXT,
    address TEXT,
    notes TEXT,
    balance_cents INTEGER NOT NULL DEFAULT 0, -- Pozitif: Alacağımız var, Negatif: Borcumuz var
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cariler_name ON cariler(name);
CREATE INDEX IF NOT EXISTS idx_cariler_phone ON cariler(phone);
CREATE INDEX IF NOT EXISTS idx_cariler_is_deleted ON cariler(is_deleted);

-- 3. KATEGORİLER
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    created_at TEXT NOT NULL
);

-- 4. ÜRÜNLER (Tekil IMEI / Seri No Takibi)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_number TEXT,
    imei TEXT,
    condition TEXT NOT NULL CHECK(condition IN ('zero', 'second_hand')),
    cosmetic_grade TEXT, -- 'Sıfır Kapalı Kutu', 'A+', 'A', 'B', 'C', 'Parça/Arızalı'
    specs TEXT, -- RAM, Depolama, Renk, Pil Sağlığı vb.
    description TEXT,
    purchase_price_cents INTEGER NOT NULL DEFAULT 0,
    estimated_sale_price_cents INTEGER NOT NULL DEFAULT 0,
    purchase_date TEXT NOT NULL,
    supplier_cari_id INTEGER REFERENCES cariler(id),
    status TEXT NOT NULL CHECK(status IN ('in_stock', 'sold', 'reserved', 'in_service')),
    images_json TEXT NOT NULL DEFAULT '[]',
    sold_sale_id INTEGER,
    sold_at TEXT,
    sold_price_cents INTEGER,
    sold_cari_id INTEGER REFERENCES cariler(id),
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_by_user_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_serial ON products(serial_number);
CREATE INDEX IF NOT EXISTS idx_products_imei ON products(imei);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON products(is_deleted);

-- 5. ALIŞ İŞLEMLERİ (Faturalar / İrsaliyeler)
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    cari_id INTEGER NOT NULL REFERENCES cariler(id),
    purchase_date TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL DEFAULT 0,
    paid_amount_cents INTEGER NOT NULL DEFAULT 0,
    remaining_amount_cents INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('nakit', 'havale_eft', 'kredi_karti', 'acik_hesap', 'parcali')),
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchases_cari ON purchases(cari_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_is_deleted ON purchases(is_deleted);

-- 6. ALIŞ DETAY KALEMLERİ
CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    price_cents INTEGER NOT NULL
);

-- 7. SATIŞ İŞLEMLERİ
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    cari_id INTEGER NOT NULL REFERENCES cariler(id),
    sale_date TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL DEFAULT 0,
    cost_amount_cents INTEGER NOT NULL DEFAULT 0,
    gross_profit_cents INTEGER NOT NULL DEFAULT 0,
    collected_amount_cents INTEGER NOT NULL DEFAULT 0,
    remaining_amount_cents INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('nakit', 'havale_eft', 'kredi_karti', 'acik_hesap', 'parcali')),
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_cari ON sales(cari_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_is_deleted ON sales(is_deleted);

-- 8. SATIŞ DETAY KALEMLERİ
CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    sale_price_cents INTEGER NOT NULL,
    cost_price_cents INTEGER NOT NULL,
    profit_cents INTEGER NOT NULL
);

-- 9. CARİ HAREKETLERİ (Ekstre Tablosu)
CREATE TABLE IF NOT EXISTS cari_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cari_id INTEGER NOT NULL REFERENCES cariler(id),
    type TEXT NOT NULL CHECK(type IN ('purchase', 'sale', 'payment_made', 'collection_received', 'opening_balance', 'correction')),
    ref_type TEXT, -- 'purchases', 'sales', 'payments'
    ref_id INTEGER,
    document_no TEXT,
    debt_cents INTEGER NOT NULL DEFAULT 0, -- Borç (Bizim lehimize alacak veya müşteriye satış)
    credit_cents INTEGER NOT NULL DEFAULT 0, -- Alacak (Bizim aleyhimize borç veya tedarikçiden alış)
    date TEXT NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cari_tx_cari ON cari_transactions(cari_id);
CREATE INDEX IF NOT EXISTS idx_cari_tx_date ON cari_transactions(date);

-- 10. ÖDEMELER VE TAHSİLATLAR
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT UNIQUE NOT NULL,
    cari_id INTEGER NOT NULL REFERENCES cariler(id),
    type TEXT NOT NULL CHECK(type IN ('collection', 'payment')), -- collection: tahsilat, payment: ödeme
    amount_cents INTEGER NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('nakit', 'havale_eft', 'kredi_karti', 'diger')),
    date TEXT NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_cari ON payments(cari_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);

-- 11. GİDERLER / MASRAFLAR
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_no TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- 'Kira', 'Kargo', 'Tamir', 'Komisyon', 'Personel', 'Elektrik', 'Yol/Ulaşım', 'Diğer'
    amount_cents INTEGER NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('nakit', 'havale_eft', 'kredi_karti', 'diger')),
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 12. AUDIT LOG (İşlem Geçmişi)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN'
    entity_type TEXT NOT NULL, -- 'product', 'sale', 'purchase', 'cari', 'payment', 'expense', 'user', 'settings'
    entity_id INTEGER,
    details_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- 13. SİSTEM AYARLARI
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT
);
