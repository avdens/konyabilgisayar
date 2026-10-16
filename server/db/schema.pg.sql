-- KONYA BİLGİSAYAR - STOK, ALIM/SATIM VE CARİ TAKİP SİSTEMİ
-- PostgreSQL (Vercel Postgres / Neon) Database Schema

-- Compatibility functions for SQLite date/time functions
CREATE OR REPLACE FUNCTION strftime(fmt text, d text) RETURNS text AS $$
BEGIN
  IF fmt = '%Y-%m' THEN
    RETURN to_char(d::date, 'YYYY-MM');
  ELSIF fmt = '%Y-%m-%d' THEN
    RETURN to_char(d::date, 'YYYY-MM-DD');
  ELSIF fmt = '%Y' THEN
    RETURN to_char(d::date, 'YYYY');
  END IF;
  RETURN substr(d, 1, 7);
EXCEPTION WHEN OTHERS THEN
  RETURN substr(d, 1, 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION strftime(fmt text, d timestamptz) RETURNS text AS $$
BEGIN
  RETURN to_char(d, 'YYYY-MM');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION julianday(d text) RETURNS double precision AS $$
BEGIN
  IF lower(d) = 'now' OR lower(d) = 'now, localtime' THEN
    RETURN extract(epoch from now()) / 86400.0 + 2440587.5;
  END IF;
  RETURN extract(epoch from d::timestamp) / 86400.0 + 2440587.5;
EXCEPTION WHEN OTHERS THEN
  RETURN extract(epoch from now()) / 86400.0 + 2440587.5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION julianday(d text, modifier text) RETURNS double precision AS $$
BEGIN
  RETURN julianday(d);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION julianday(d timestamptz) RETURNS double precision AS $$
BEGIN
  RETURN extract(epoch from d) / 86400.0 + 2440587.5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. KULLANICILAR
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('admin', 'staff')),
    is_active SMALLINT NOT NULL DEFAULT 1,
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
);

-- 2. CARİLER (Müşteri & Tedarikçi)
CREATE TABLE IF NOT EXISTS cariler (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK(type IN ('customer', 'supplier', 'both')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(150),
    tc_vkn VARCHAR(50),
    tax_office VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Konya',
    district VARCHAR(100),
    address TEXT,
    notes TEXT,
    balance_cents BIGINT NOT NULL DEFAULT 0,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at VARCHAR(50),
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cariler_name ON cariler(name);
CREATE INDEX IF NOT EXISTS idx_cariler_phone ON cariler(phone);
CREATE INDEX IF NOT EXISTS idx_cariler_is_deleted ON cariler(is_deleted);

-- 3. KATEGORİLER
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    icon VARCHAR(50),
    created_at VARCHAR(50) NOT NULL
);

-- 4. ÜRÜNLER (Tekil IMEI / Seri No Takibi)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    serial_number VARCHAR(100),
    imei VARCHAR(50),
    condition VARCHAR(20) NOT NULL CHECK(condition IN ('zero', 'second_hand')),
    cosmetic_grade VARCHAR(100),
    specs TEXT,
    description TEXT,
    purchase_price_cents BIGINT NOT NULL DEFAULT 0,
    estimated_sale_price_cents BIGINT NOT NULL DEFAULT 0,
    purchase_date VARCHAR(50) NOT NULL,
    supplier_cari_id INTEGER REFERENCES cariler(id),
    status VARCHAR(20) NOT NULL CHECK(status IN ('in_stock', 'sold', 'reserved', 'in_service')),
    images_json TEXT NOT NULL DEFAULT '[]',
    sold_sale_id INTEGER,
    sold_at VARCHAR(50),
    sold_price_cents BIGINT,
    sold_cari_id INTEGER REFERENCES cariler(id),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at VARCHAR(50),
    created_by_user_id INTEGER REFERENCES users(id),
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_serial ON products(serial_number);
CREATE INDEX IF NOT EXISTS idx_products_imei ON products(imei);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON products(is_deleted);

-- 5. ALIŞ İŞLEMLERİ
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INTEGER NOT NULL REFERENCES cariler(id),
    purchase_date VARCHAR(50) NOT NULL,
    total_amount_cents BIGINT NOT NULL DEFAULT 0,
    paid_amount_cents BIGINT NOT NULL DEFAULT 0,
    remaining_amount_cents BIGINT NOT NULL DEFAULT 0,
    payment_method VARCHAR(30) NOT NULL CHECK(payment_method IN ('nakit', 'havale_eft', 'kredi_karti', 'acik_hesap', 'parcali')),
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at VARCHAR(50),
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchases_cari ON purchases(cari_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_is_deleted ON purchases(is_deleted);

-- 6. ALIŞ DETAY KALEMLERİ
CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    price_cents BIGINT NOT NULL
);

-- 7. SATIŞ İŞLEMLERİ
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INTEGER NOT NULL REFERENCES cariler(id),
    sale_date VARCHAR(50) NOT NULL,
    total_amount_cents BIGINT NOT NULL DEFAULT 0,
    cost_amount_cents BIGINT NOT NULL DEFAULT 0,
    gross_profit_cents BIGINT NOT NULL DEFAULT 0,
    collected_amount_cents BIGINT NOT NULL DEFAULT 0,
    remaining_amount_cents BIGINT NOT NULL DEFAULT 0,
    payment_method VARCHAR(30) NOT NULL CHECK(payment_method IN ('nakit', 'havale_eft', 'kredi_karti', 'acik_hesap', 'parcali')),
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at VARCHAR(50),
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_cari ON sales(cari_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_is_deleted ON sales(is_deleted);

-- 8. SATIŞ DETAY KALEMLERİ
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    sale_price_cents BIGINT NOT NULL,
    cost_price_cents BIGINT NOT NULL,
    profit_cents BIGINT NOT NULL
);

-- 9. CARİ HAREKETLERİ (Ekstre Tablosu)
CREATE TABLE IF NOT EXISTS cari_transactions (
    id SERIAL PRIMARY KEY,
    cari_id INTEGER NOT NULL REFERENCES cariler(id),
    type VARCHAR(30) NOT NULL CHECK(type IN ('purchase', 'sale', 'payment_made', 'collection_received', 'opening_balance', 'correction')),
    ref_type VARCHAR(30),
    ref_id INTEGER,
    document_no VARCHAR(50),
    debt_cents BIGINT NOT NULL DEFAULT 0,
    credit_cents BIGINT NOT NULL DEFAULT 0,
    date VARCHAR(50) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    created_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cari_tx_cari ON cari_transactions(cari_id);
CREATE INDEX IF NOT EXISTS idx_cari_tx_date ON cari_transactions(date);

-- 10. ÖDEMELER VE TAHSİLATLAR
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INTEGER NOT NULL REFERENCES cariler(id),
    type VARCHAR(20) NOT NULL CHECK(type IN ('collection', 'payment')),
    amount_cents BIGINT NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK(payment_method IN ('nakit', 'havale_eft', 'kredi_karti', 'diger')),
    date VARCHAR(50) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at VARCHAR(50),
    created_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_cari ON payments(cari_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);

-- 11. GİDERLER / MASRAFLAR
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_no VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount_cents BIGINT NOT NULL,
    date VARCHAR(50) NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK(payment_method IN ('nakit', 'havale_eft', 'kredi_karti', 'diger')),
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at VARCHAR(50),
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 12. AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    details_json TEXT,
    ip_address VARCHAR(100),
    created_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- 13. SİSTEM AYARLARI
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT
);
