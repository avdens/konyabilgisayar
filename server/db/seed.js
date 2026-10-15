const bcrypt = require('bcryptjs');
const { db, recalculateCariBalance, runInTransaction, logAudit } = require('./connection');

function seedDatabase() {
  const existingUsers = db.prepare('SELECT count(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    console.log('Veritabanında mevcut veri var, seed atlandı.');
    return;
  }

  console.log('Veritabanı KONYA BİLGİSAYAR demo verileri ile dolduruluyor...');

  runInTransaction(() => {
    // 1. KULLANICILAR
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const staffPass = bcrypt.hashSync('personel123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);

    const adminUser = insertUser.run('admin', adminPass, 'Mehmet Yönetici', 'admin', 1);
    const staffUser = insertUser.run('personel', staffPass, 'Ali Personel', 'staff', 1);

    // 2. SİSTEM AYARLARI
    const insertSetting = db.prepare(`INSERT INTO settings (key, value, description) VALUES (?, ?, ?)`);
    insertSetting.run('company_name', 'KONYA BİLGİSAYAR', 'Firma Ünvanı');
    insertSetting.run('phone', '0 (332) 350 42 42', 'İletişim Telefonu');
    insertSetting.run('email', 'info@konyabilgisayar.com', 'E-posta');
    insertSetting.run('address', 'Rampalı Çarşı Kat: 1 No: 42 Meram / KONYA', 'Adres Bilgisi');
    insertSetting.run('tax_info', 'Mevlana V.D. - 4250198273', 'Vergi Dairesi ve No');
    insertSetting.run('currency', 'TRY', 'Para Birimi');
    insertSetting.run('receipt_footer', 'KONYA BİLGİSAYAR - İkinci el ve sıfır elektronikte güvenilir adres. Ürünlerimiz test edilmiş ve 1 ay firma garantilidir.', 'Fiş Altı Açıklama');

    // 3. KATEGORİLER
    const categories = [
      { name: 'Laptop & Dizüstü', slug: 'laptop', icon: 'laptop' },
      { name: 'Apple / MacBook & iMac', slug: 'apple-mac', icon: 'apple' },
      { name: 'Akıllı Telefon / iPhone', slug: 'telefon', icon: 'smartphone' },
      { name: 'Oyun Konsolu (PlayStation / Xbox)', slug: 'konsol', icon: 'gamepad-2' },
      { name: 'Ekran Kartı (GPU)', slug: 'ekran-karti', icon: 'cpu' },
      { name: 'Masaüstü & Gaming Kasa', slug: 'masaustu', icon: 'monitor' },
      { name: 'Monitör', slug: 'monitor', icon: 'tv' },
      { name: 'Kulaklık & Ses Sistemleri', slug: 'kulaklik', icon: 'headphones' },
      { name: 'VR Gözlük & Aksesuar', slug: 'vr-gozluk', icon: 'glasses' }
    ];

    const insertCategory = db.prepare(`
      INSERT INTO categories (name, slug, icon, created_at)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `);

    const catMap = {};
    for (const c of categories) {
      const res = insertCategory.run(c.name, c.slug, c.icon);
      catMap[c.slug] = res.lastInsertRowid;
    }

    // 4. CARİLER
    const cariler = [
      {
        code: 'CR-0001',
        type: 'supplier',
        name: 'Arena Bilgisayar Dağıtım A.Ş.',
        phone: '0 (216) 528 70 00',
        email: 'info@arena.com.tr',
        tc_vkn: '0780019284',
        tax_office: 'Ümraniye V.D.',
        city: 'İstanbul',
        district: 'Ümraniye',
        address: 'Balkan Cad. No: 48 Ümraniye',
        notes: 'Resmi distribütör sıfır ürünler için'
      },
      {
        code: 'CR-0002',
        type: 'supplier',
        name: 'Genpa Telekomünikasyon',
        phone: '0 (212) 359 00 00',
        email: 'kurumsal@genpa.com.tr',
        tc_vkn: '3940028190',
        tax_office: 'Zincirlikuyu V.D.',
        city: 'İstanbul',
        district: 'Şişli',
        address: 'Büyükdere Cad. No: 120 Şişli',
        notes: 'Apple & Samsung distribütörü'
      },
      {
        code: 'CR-0003',
        type: 'both',
        name: 'Emre Çelik - İkinci El Alım/Satım',
        phone: '0 (542) 420 42 10',
        email: 'emre.celik42@gmail.com',
        tc_vkn: '28491823746',
        tax_office: 'Selçuklu V.D.',
        city: 'Konya',
        district: 'Selçuklu',
        address: 'Nalçacı Cad. No: 15/B',
        notes: 'Sürekli takas ve temiz cihaz alıp satar'
      },
      {
        code: 'CR-0004',
        type: 'customer',
        name: 'Mustafa Demir (Demir Yazılım Ltd.)',
        phone: '0 (532) 345 67 89',
        email: 'mustafa@demiryazilim.com',
        tc_vkn: '2740192837',
        tax_office: 'Mevlana V.D.',
        city: 'Konya',
        district: 'Karatay',
        address: 'Karatay Sanayi Sit. 24. Sok. No: 12',
        notes: 'Şirket yazılımcıları için laptop alır'
      },
      {
        code: 'CR-0005',
        type: 'customer',
        name: 'Ahmet Faruk Yılmaz',
        phone: '0 (505) 987 65 43',
        email: 'ahmetfaruk@gmail.com',
        tc_vkn: '19482736152',
        tax_office: 'Meram V.D.',
        city: 'Konya',
        district: 'Meram',
        address: 'Havzan Mah. Ebussuut Cad. 18/4',
        notes: 'PlayStation ve iPhone müşterisi'
      },
      {
        code: 'CR-0006',
        type: 'customer',
        name: 'Karatay E-Spor Merkezi',
        phone: '0 (332) 234 11 22',
        email: 'espor@karatay.com',
        tc_vkn: '5192847361',
        tax_office: 'Selçuklu V.D.',
        city: 'Konya',
        district: 'Selçuklu',
        address: 'Bosna Hersek Mah. Mesaj Cad. No: 8',
        notes: 'Ekran kartı ve oyuncu monitörü alır'
      }
    ];

    const insertCari = db.prepare(`
      INSERT INTO cariler (code, type, name, phone, email, tc_vkn, tax_office, city, district, address, notes, balance_cents, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);

    const cariMap = {};
    for (const cari of cariler) {
      const res = insertCari.run(
        cari.code, cari.type, cari.name, cari.phone, cari.email, cari.tc_vkn,
        cari.tax_office, cari.city, cari.district, cari.address, cari.notes
      );
      cariMap[cari.code] = res.lastInsertRowid;
    }

    // 5. ÜRÜNLER (Elektronik, Bilgisayar, Telefon, Konsol vb.)
    const productsData = [
      {
        code: 'URN-1001',
        name: 'Apple MacBook Pro 16" M3 Max 36GB RAM 1TB SSD Space Black',
        cat: 'apple-mac',
        brand: 'Apple',
        model: 'MacBook Pro 16" M3 Max',
        serial: 'C02G90J1MD6R',
        imei: null,
        condition: 'zero',
        cosmetic: 'Sıfır Kapalı Kutu',
        specs: 'Apple M3 Max (14 CPU, 30 GPU), 36GB Birleşik Bellek, 1TB SSD, 16.2" Liquid Retina XDR Ekran, Space Black',
        desc: 'Türkiye Apple garantili kapalı kutu sıfır ürün.',
        purchase_cents: 11000000, // 110.000 TL
        est_sale_cents: 12800000, // 128.000 TL
        purchase_date: '2026-09-20',
        supplier_id: cariMap['CR-0001'],
        status: 'in_stock'
      },
      {
        code: 'URN-1002',
        name: 'Apple iPhone 15 Pro Max 256GB Naturel Titanyum',
        cat: 'telefon',
        brand: 'Apple',
        model: 'iPhone 15 Pro Max 256GB',
        serial: 'F2LLQ08MPX91',
        imei: '356891234567891',
        condition: 'second_hand',
        cosmetic: 'A+ Kusursuz',
        specs: '256GB Depolama, Naturel Titanyum, Pil Sağlığı %98, Kutu ve Fatura Mevcut',
        desc: 'Müşteri yurtiçi faturalı cihaz getirdi, kılcal çizik dahi yok, ekran koruyucu ve kılıfla kullanılmış.',
        purchase_cents: 6800000, // 68.000 TL
        est_sale_cents: 7750000, // 77.500 TL
        purchase_date: '2026-10-01',
        supplier_id: cariMap['CR-0003'],
        status: 'in_stock'
      },
      {
        code: 'URN-1003',
        name: 'Sony PlayStation 5 Slim 1TB CD Edition + 2. DualSense Kol',
        cat: 'konsol',
        brand: 'Sony',
        model: 'PlayStation 5 Slim 1TB CD Edition',
        serial: 'S01-9284716-G',
        imei: null,
        condition: 'zero',
        cosmetic: 'Sıfır Kapalı Kutu',
        specs: '1TB Ultra Hızlı SSD, 4K 120Hz, Ray Tracing, 2 adet Orijinal DualSense Kol (Beyaz + Siyah)',
        desc: 'Bilkom Türkiye garantili 2 yıl, sıfır kapalı kutu konsol ve ekstra kol.',
        purchase_cents: 2250000, // 22.500 TL
        est_sale_cents: 2690000, // 26.900 TL
        purchase_date: '2026-09-15',
        supplier_id: cariMap['CR-0001'],
        status: 'in_stock'
      },
      {
        code: 'URN-1004',
        name: 'Asus ROG Strix G16 i9-13980HX 32GB 1TB SSD RTX 4070 240Hz',
        cat: 'laptop',
        brand: 'Asus',
        model: 'ROG Strix G16 G614JI',
        serial: 'R8NRCX01827402F',
        imei: null,
        condition: 'second_hand',
        cosmetic: 'A Çok Temiz',
        specs: 'Intel Core i9-13980HX, 32GB DDR5 5600MHz RAM, 1TB NVMe PCIe 4.0 SSD, RTX 4070 8GB 140W, 16" QHD+ 240Hz',
        desc: 'Garantisi 8 ay devam ediyor, adaptör ve kutusu var.',
        purchase_cents: 5400000, // 54.000 TL
        est_sale_cents: 6450000, // 64.500 TL
        purchase_date: '2026-08-10', // slow-moving item (> 45 days)
        supplier_id: cariMap['CR-0003'],
        status: 'in_stock'
      },
      {
        code: 'URN-1005',
        name: 'MSI GeForce RTX 4080 Super 16GB Gaming X Slim',
        cat: 'ekran-karti',
        brand: 'MSI',
        model: 'RTX 4080 Super Gaming X Slim',
        serial: '602-V511-180SB240100482',
        imei: null,
        condition: 'zero',
        cosmetic: 'Sıfır Kapalı Kutu',
        specs: '16GB GDDR6X 256-bit, Tri Frozr 3 Soğutma, DLSS 3.5, PCIe 4.0',
        desc: 'Sıfır distribütör garantili.',
        purchase_cents: 4300000, // 43.000 TL
        est_sale_cents: 5100000, // 51.000 TL
        purchase_date: '2026-10-05',
        supplier_id: cariMap['CR-0001'],
        status: 'in_stock'
      },
      {
        code: 'URN-1006',
        name: 'Samsung Galaxy S24 Ultra 512GB Titanyum Gri',
        cat: 'telefon',
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra 512GB',
        serial: 'R5CW1082KLA',
        imei: '359871234567890',
        condition: 'zero',
        cosmetic: 'Sıfır Kapalı Kutu',
        specs: 'Snapdragon 8 Gen 3 for Galaxy, 12GB RAM, 512GB Hafıza, Titanyum Kasa, Galaxy AI, S-Pen',
        desc: 'Samsung Türkiye garantili sıfır cihaz.',
        purchase_cents: 6100000, // 61.000 TL
        est_sale_cents: 7100000, // 71.000 TL
        purchase_date: '2026-10-08',
        supplier_id: cariMap['CR-0002'],
        status: 'in_stock'
      },
      {
        code: 'URN-1007',
        name: 'Meta Quest 3 512GB VR Sanal Gerçeklik Gözlüğü',
        cat: 'vr-gozluk',
        brand: 'Meta',
        model: 'Quest 3 512GB',
        serial: '2G0YC102948201',
        imei: null,
        condition: 'second_hand',
        cosmetic: 'A Çok Temiz',
        specs: '512GB Depolama, Snapdragon XR2 Gen 2, 4K+ Infinite Display, Renkli Geçiş (Pass-through), 2 Kontrolcü',
        desc: 'Çok az kullanılmış, lenslerde ve kasada en ufak çizik yok.',
        purchase_cents: 2100000, // 21.000 TL
        est_sale_cents: 2650000, // 26.500 TL
        purchase_date: '2026-10-09',
        supplier_id: cariMap['CR-0003'],
        status: 'in_stock'
      },
      {
        code: 'URN-1008',
        name: 'Dell UltraSharp 27" U2723QE 4K IPS Black USB-C Hub Monitör',
        cat: 'monitor',
        brand: 'Dell',
        model: 'UltraSharp U2723QE',
        serial: 'CN-0K7W2R-WS200-34A',
        imei: null,
        condition: 'second_hand',
        cosmetic: 'A+ Kusursuz',
        specs: '27 inç 4K UHD (3840x2160), IPS Black Teknolojisi 2000:1 Kontrast, 90W USB-C PD, RJ-45 Ethernet Hub, Pivot Ayak',
        desc: 'Tasarım ve ofis için sıfır ayarında, ölü piksel veya ışık sızması yok.',
        purchase_cents: 1600000, // 16.000 TL
        est_sale_cents: 2100000, // 21.000 TL
        purchase_date: '2026-09-01', // slow moving
        supplier_id: cariMap['CR-0003'],
        status: 'in_stock'
      },
      {
        code: 'URN-1009',
        name: 'Sony WH-1000XM5 Aktif Gürültü Engelleyici Kablosuz Kulaklık Siyah',
        cat: 'kulaklik',
        brand: 'Sony',
        model: 'WH-1000XM5 Siyah',
        serial: '7392816',
        imei: null,
        condition: 'zero',
        cosmetic: 'Sıfır Kapalı Kutu',
        specs: 'Endüstri lideri ANC gürültü engelleme, 30 saat pil ömrü, LDAC Hi-Res Audio, Taşıma Çantalı',
        desc: 'Sıfır kutulu distribütör ürünü.',
        purchase_cents: 1150000, // 11.500 TL
        est_sale_cents: 1450000, // 14.500 TL
        purchase_date: '2026-10-10',
        supplier_id: cariMap['CR-0001'],
        status: 'in_stock'
      },
      {
        code: 'URN-1010',
        name: 'Apple MacBook Air 13" M2 8GB RAM 256GB SSD Gece Yarısı',
        cat: 'apple-mac',
        brand: 'Apple',
        model: 'MacBook Air 13" M2',
        serial: 'C02KF914MD6R',
        imei: null,
        condition: 'second_hand',
        cosmetic: 'B Kılcal Çizikler',
        specs: 'Apple M2 Çip (8 CPU, 8 GPU), 8GB Birleşik Bellek, 256GB SSD, Pil Sağlığı %89 (Devir: 184)',
        desc: 'Kullanıma bağlı alt kapakta kılcal çizik mevcut, ekran ve klavye sorunsuz.',
        purchase_cents: 2600000, // 26.000 TL
        est_sale_cents: 3200000, // 32.000 TL
        purchase_date: '2026-08-25',
        supplier_id: cariMap['CR-0003'],
        status: 'reserved' // Rezerve durumu testi
      },
      {
        code: 'URN-1011',
        name: 'Apple iPhone 14 128GB Gece Yarısı',
        cat: 'telefon',
        brand: 'Apple',
        model: 'iPhone 14 128GB',
        serial: 'F1LLQ0918X42',
        imei: '354789123456782',
        condition: 'second_hand',
        cosmetic: 'A Çok Temiz',
        specs: '128GB Gece Yarısı Siyah, Pil Sağlığı %88, Kutulu',
        desc: 'Temiz kullanılmış, tamir görmemiş.',
        purchase_cents: 3600000, // 36.000 TL
        est_sale_cents: 4350000, // 43.500 TL
        purchase_date: '2026-09-28',
        supplier_id: cariMap['CR-0003'],
        status: 'sold' // Sold item
      },
      {
        code: 'URN-1012',
        name: 'Lenovo Legion 5 Pro Ryzen 7 5800H 16GB 1TB SSD RTX 3070',
        cat: 'laptop',
        brand: 'Lenovo',
        model: 'Legion 5 Pro 16ACH6H',
        serial: 'PF2XY719',
        imei: null,
        condition: 'second_hand',
        cosmetic: 'A Çok Temiz',
        specs: 'AMD Ryzen 7 5800H, 16GB DDR4, 1TB NVMe SSD, RTX 3070 140W, 16" WQXGA 165Hz IPS Ekran',
        desc: 'Tertemiz oyuncu bilgisayarı, kutulu ve orijinal adaptörlü.',
        purchase_cents: 3200000, // 32.000 TL
        est_sale_cents: 4100000, // 41.000 TL
        purchase_date: '2026-09-12',
        supplier_id: cariMap['CR-0003'],
        status: 'sold' // Sold item
      }
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (
        product_code, name, category_id, brand, model, serial_number, imei,
        condition, cosmetic_grade, specs, description, purchase_price_cents,
        estimated_sale_price_cents, purchase_date, supplier_cari_id, status,
        images_json, created_by_user_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, datetime('now', 'localtime'))
    `);

    const productMap = {};
    for (const p of productsData) {
      const res = insertProduct.run(
        p.code, p.name, catMap[p.cat], p.brand, p.model, p.serial, p.imei,
        p.condition, p.cosmetic, p.specs, p.desc, p.purchase_cents,
        p.est_sale_cents, p.purchase_date, p.supplier_id, p.status,
        adminUser.lastInsertRowid, p.purchase_date + ' 10:00:00'
      );
      productMap[p.code] = res.lastInsertRowid;
    }

    // 6. ALIŞ İŞLEMLERİ (Faturalar ve Borçlar)
    // Alış 1: Arena Bilgisayar'dan Sıfır Ürünler (MacBook Pro + PS5 Slim + RTX 4080 Super + Kulaklık)
    // Toplam: 110.000 + 22.500 + 43.000 + 11.500 = 187.000 TL
    // Ödenen: 120.000 TL, Kalan Borç: 67.000 TL
    const p1Total = 11000000 + 2250000 + 4300000 + 1150000;
    const p1Paid = 12000000;
    const p1Rem = p1Total - p1Paid;

    const insertPurchase = db.prepare(`
      INSERT INTO purchases (invoice_no, cari_id, purchase_date, total_amount_cents, paid_amount_cents, remaining_amount_cents, payment_method, notes, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const p1 = insertPurchase.run('ALS-2026-0001', cariMap['CR-0001'], '2026-09-20', p1Total, p1Paid, p1Rem, 'havale_eft', 'Eylül ayı sıfır distribütör ürün sevkiyatı', adminUser.lastInsertRowid, '2026-09-20 11:30:00');
    
    const insertPurchaseItem = db.prepare(`INSERT INTO purchase_items (purchase_id, product_id, price_cents) VALUES (?, ?, ?)`);
    insertPurchaseItem.run(p1.lastInsertRowid, productMap['URN-1001'], 11000000);
    insertPurchaseItem.run(p1.lastInsertRowid, productMap['URN-1003'], 2250000);
    insertPurchaseItem.run(p1.lastInsertRowid, productMap['URN-1005'], 4300000);
    insertPurchaseItem.run(p1.lastInsertRowid, productMap['URN-1009'], 1150000);

    // Cari hareket: Alış yapıldı -> Cari alacaklandı (Credit)
    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'purchase', 'purchases', ?, 'ALS-2026-0001', 0, ?, '2026-09-20', 'Mal Alışı - Fatura No: ALS-2026-0001', ?, '2026-09-20 11:30:00')
    `).run(cariMap['CR-0001'], p1.lastInsertRowid, p1Total, adminUser.lastInsertRowid);

    // Cari hareket: Alış sırasında peşin ödeme yapıldı -> Cari borçlandı (Debt)
    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'payment_made', 'purchases', ?, 'ALS-2026-0001', ?, 0, '2026-09-20', 'Alış Peşinat Ödemesi (Havale/EFT)', ?, '2026-09-20 11:30:00')
    `).run(cariMap['CR-0001'], p1.lastInsertRowid, p1Paid, adminUser.lastInsertRowid);

    // Alış 2: Emre Çelik'ten 2. El Cihaz Alımları
    // iPhone 15 Pro Max (68.000) + Dell Monitör (16.000) + Meta Quest 3 (21.000) = 105.000 TL
    // Ödenen: 80.000 TL (Nakit), Kalan Borç: 25.000 TL
    const p2Total = 6800000 + 1600000 + 2100000;
    const p2Paid = 8000000;
    const p2Rem = p2Total - p2Paid;

    const p2 = insertPurchase.run('ALS-2026-0002', cariMap['CR-0003'], '2026-10-01', p2Total, p2Paid, p2Rem, 'nakit', 'İkinci el temiz cihaz alımı toplu', adminUser.lastInsertRowid, '2026-10-01 14:00:00');
    insertPurchaseItem.run(p2.lastInsertRowid, productMap['URN-1002'], 6800000);
    insertPurchaseItem.run(p2.lastInsertRowid, productMap['URN-1008'], 1600000);
    insertPurchaseItem.run(p2.lastInsertRowid, productMap['URN-1007'], 2100000);

    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'purchase', 'purchases', ?, 'ALS-2026-0002', 0, ?, '2026-10-01', 'Cihaz Alımı - Belge No: ALS-2026-0002', ?, '2026-10-01 14:00:00')
    `).run(cariMap['CR-0003'], p2.lastInsertRowid, p2Total, adminUser.lastInsertRowid);

    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'payment_made', 'purchases', ?, 'ALS-2026-0002', ?, 0, '2026-10-01', 'Alış Peşinatı (Nakit)', ?, '2026-10-01 14:00:00')
    `).run(cariMap['CR-0003'], p2.lastInsertRowid, p2Paid, adminUser.lastInsertRowid);

    // 7. SATIŞ İŞLEMLERİ (Faturalar ve Alacaklar)
    // Satış 1: Mustafa Demir'e (Demir Yazılım) Lenovo Legion 5 Pro satışı
    // Satış Fiyatı: 42.000 TL, Maliyet: 32.000 TL, Brüt Kâr: 10.000 TL
    // Tahsil Edilen: 25.000 TL (Kredi Kartı), Kalan Alacak: 17.000 TL
    const s1Total = 4200000;
    const s1Cost = 3200000;
    const s1Profit = s1Total - s1Cost;
    const s1Paid = 2500000;
    const s1Rem = s1Total - s1Paid;

    const insertSale = db.prepare(`
      INSERT INTO sales (invoice_no, cari_id, sale_date, total_amount_cents, cost_amount_cents, gross_profit_cents, collected_amount_cents, remaining_amount_cents, payment_method, notes, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const s1 = insertSale.run('SAT-2026-0001', cariMap['CR-0004'], '2026-10-06', s1Total, s1Cost, s1Profit, s1Paid, s1Rem, 'kredi_karti', 'Yazılım ofisi için cihaz satışı', adminUser.lastInsertRowid, '2026-10-06 15:45:00');

    const insertSaleItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, sale_price_cents, cost_price_cents, profit_cents)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertSaleItem.run(s1.lastInsertRowid, productMap['URN-1012'], s1Total, s1Cost, s1Profit);

    // Ürün durumunu satıldı olarak güncelle
    db.prepare(`
      UPDATE products 
      SET status = 'sold', sold_sale_id = ?, sold_at = '2026-10-06 15:45:00', sold_price_cents = ?, sold_cari_id = ?
      WHERE id = ?
    `).run(s1.lastInsertRowid, s1Total, cariMap['CR-0004'], productMap['URN-1012']);

    // Cari hareket: Satış yapıldı -> Cari borçlandı (Debt)
    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'sale', 'sales', ?, 'SAT-2026-0001', ?, 0, '2026-10-06', 'Ürün Satışı - Fatura: SAT-2026-0001 (Lenovo Legion)', ?, '2026-10-06 15:45:00')
    `).run(cariMap['CR-0004'], s1.lastInsertRowid, s1Total, adminUser.lastInsertRowid);

    // Cari hareket: Tahsilat yapıldı -> Cari borcu düştü (Credit)
    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'collection_received', 'sales', ?, 'SAT-2026-0001', 0, ?, '2026-10-06', 'Satış Sırası Tahsilat (Kredi Kartı)', ?, '2026-10-06 15:45:00')
    `).run(cariMap['CR-0004'], s1.lastInsertRowid, s1Paid, adminUser.lastInsertRowid);

    // Satış 2: Ahmet Faruk Yılmaz'a iPhone 14 128GB satışı
    // Satış Fiyatı: 43.500 TL, Maliyet: 36.000 TL, Brüt Kâr: 7.500 TL
    // Tahsil Edilen: 43.500 TL (Tamamı Nakit Alındı, Kalan: 0 TL)
    const s2Total = 4350000;
    const s2Cost = 3600000;
    const s2Profit = s2Total - s2Cost;
    const s2Paid = 4350000;
    const s2Rem = 0;

    const s2 = insertSale.run('SAT-2026-0002', cariMap['CR-0005'], '2026-10-12', s2Total, s2Cost, s2Profit, s2Paid, s2Rem, 'nakit', 'Müşteri elden nakit ödeyerek teslim aldı', staffUser.lastInsertRowid, '2026-10-12 17:15:00');
    insertSaleItem.run(s2.lastInsertRowid, productMap['URN-1011'], s2Total, s2Cost, s2Profit);

    db.prepare(`
      UPDATE products 
      SET status = 'sold', sold_sale_id = ?, sold_at = '2026-10-12 17:15:00', sold_price_cents = ?, sold_cari_id = ?
      WHERE id = ?
    `).run(s2.lastInsertRowid, s2Total, cariMap['CR-0005'], productMap['URN-1011']);

    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'sale', 'sales', ?, 'SAT-2026-0002', ?, 0, '2026-10-12', 'Ürün Satışı - Fatura: SAT-2026-0002 (iPhone 14)', ?, '2026-10-12 17:15:00')
    `).run(cariMap['CR-0005'], s2.lastInsertRowid, s2Total, staffUser.lastInsertRowid);

    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'collection_received', 'sales', ?, 'SAT-2026-0002', 0, ?, '2026-10-12', 'Nakit Satış Bedeli Tahsilatı', ?, '2026-10-12 17:15:00')
    `).run(cariMap['CR-0005'], s2.lastInsertRowid, s2Paid, staffUser.lastInsertRowid);

    // 8. AYRI ÖDEMELER VE TAHSİLATLAR (Sonradan yapılan kısmi ödemeler)
    // Arena Bilgisayar'a 30.000 TL ara ödeme yapıyoruz
    const insertPayment = db.prepare(`
      INSERT INTO payments (receipt_no, cari_id, type, amount_cents, payment_method, date, description, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const pay1 = insertPayment.run('ODM-2026-0001', cariMap['CR-0001'], 'payment', 3000000, 'havale_eft', '2026-10-08', 'Arena Bilgisayar Cari Hesaba Havale Ödemesi', adminUser.lastInsertRowid);

    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'payment_made', 'payments', ?, 'ODM-2026-0001', 3000000, 0, '2026-10-08', 'Tedarikçiye Havale Ödemesi (Belge: ODM-2026-0001)', ?, '2026-10-08 14:20:00')
    `).run(cariMap['CR-0001'], pay1.lastInsertRowid, adminUser.lastInsertRowid);

    // Mustafa Demir'den kalan 17.000 TL alacağın 7.000 TL'si tahsil edildi
    const col1 = insertPayment.run('THS-2026-0001', cariMap['CR-0004'], 'collection', 700000, 'havale_eft', '2026-10-10', 'Demir Yazılım ara bakiye tahsilatı', staffUser.lastInsertRowid);

    db.prepare(`
      INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
      VALUES (?, 'collection_received', 'payments', ?, 'THS-2026-0001', 0, 700000, '2026-10-10', 'Müşteriden Kısmi Tahsilat (Belge: THS-2026-0001)', ?, '2026-10-10 16:30:00')
    `).run(cariMap['CR-0004'], col1.lastInsertRowid, staffUser.lastInsertRowid);

    // 9. İŞLETME GİDERLERİ / MASRAFLAR
    const expenses = [
      { no: 'MSF-2026-0001', cat: 'Kira', amount: 2500000, date: '2026-10-01', method: 'havale_eft', desc: 'Ekim Ayı Rampalı Çarşı Dükkan Kirası' },
      { no: 'MSF-2026-0002', cat: 'Elektrik', amount: 345000, date: '2026-10-03', method: 'kredi_karti', desc: 'Medaş Dükkan Elektrik Faturası' },
      { no: 'MSF-2026-0003', cat: 'Kargo', amount: 125000, date: '2026-10-07', method: 'nakit', desc: 'Yurtiçi Kargo İstanbul sevkiyat ve kurye bedeli' },
      { no: 'MSF-2026-0004', cat: 'Tamir', amount: 85000, date: '2026-10-09', method: 'nakit', desc: 'MacBook klavye temizliği ve bakım kimyasalları' },
      { no: 'MSF-2026-0005', cat: 'Personel', amount: 1500000, date: '2026-10-11', method: 'havale_eft', desc: 'Personel haftalık avans ödemesi' },
      { no: 'MSF-2026-0006', cat: 'Diğer', amount: 48000, date: '2026-10-13', method: 'nakit', desc: 'Müşteri ikramı, çay, kahve ve temizlik malzemesi' }
    ];

    const insertExpense = db.prepare(`
      INSERT INTO expenses (expense_no, category, amount_cents, date, payment_method, description, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);

    for (const exp of expenses) {
      insertExpense.run(exp.no, exp.cat, exp.amount, exp.date, exp.method, exp.desc, adminUser.lastInsertRowid);
    }

    // 10. TÜM CARİ BAKİYELERİNİ KONTROL VE HESAPLAMA
    for (const cariId of Object.values(cariMap)) {
      recalculateCariBalance(cariId);
    }

    // 11. AUDIT LOG SEEDING
    logAudit(adminUser.lastInsertRowid, 'admin', 'CREATE', 'system', 1, 'Konya Bilgisayar sistemi ilk kurulumu ve demo verileri yüklendi.');
  });

  console.log('Seed başarıyla tamamlandı!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
