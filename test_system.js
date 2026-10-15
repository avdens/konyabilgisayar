const assert = require('assert');

async function runTests() {
  const BASE_URL = 'http://localhost:5001/api';
  console.log('--- KONYA BİLGİSAYAR - UÇTAN UCA SİSTEM DOĞRULAMA TESTİ ---');

  // Helper fetch
  async function req(url, options = {}, token = null) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  // 1. Health check
  console.log('1. Health Check Test Ediliyor...');
  const health = await req('/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.store, 'KONYA BİLGİSAYAR');
  console.log('✓ Health Check Başarılı:', health.data.store);

  // 2. Admin & Staff Login
  console.log('\n2. Giriş (Authentication) Test Ediliyor...');
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert.strictEqual(adminLogin.status, 200);
  assert.ok(adminLogin.data.token);
  assert.strictEqual(adminLogin.data.user.role, 'admin');
  const adminToken = adminLogin.data.token;
  console.log('✓ Yönetici Girişi Başarılı:', adminLogin.data.user.full_name);

  const staffLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'personel', password: 'personel123' })
  });
  assert.strictEqual(staffLogin.status, 200);
  assert.strictEqual(staffLogin.data.user.role, 'staff');
  const staffToken = staffLogin.data.token;
  console.log('✓ Personel Girişi Başarılı:', staffLogin.data.user.full_name);

  // 3. Dashboard Metrics
  console.log('\n3. Dashboard Metrikleri Test Ediliyor...');
  const dashAdmin = await req('/dashboard', {}, adminToken);
  assert.strictEqual(dashAdmin.status, 200);
  assert.ok(dashAdmin.data.metrics.totalStockCount > 0);
  assert.ok(dashAdmin.data.metrics.totalStockCost > 0);
  console.log('✓ Dashboard Yönetici Metrikleri:');
  console.log('  - Toplam Stok Adedi:', dashAdmin.data.metrics.totalStockCount);
  console.log('  - Toplam Stok Maliyeti:', (dashAdmin.data.metrics.totalStockCost / 100).toLocaleString('tr-TR'), 'TL');
  console.log('  - Tahmini Satış Değeri:', (dashAdmin.data.metrics.totalStockEstimatedValue / 100).toLocaleString('tr-TR'), 'TL');
  console.log('  - Toplam Cari Alacak:', (dashAdmin.data.metrics.totalReceivables / 100).toLocaleString('tr-TR'), 'TL');
  console.log('  - Toplam Cari Borç:', (dashAdmin.data.metrics.totalPayables / 100).toLocaleString('tr-TR'), 'TL');

  // Verify staff cannot see costs/profits
  const dashStaff = await req('/dashboard', {}, staffToken);
  assert.strictEqual(dashStaff.data.metrics.totalStockCost, null);
  assert.strictEqual(dashStaff.data.metrics.monthlyGrossProfit, null);
  console.log('✓ Personel Rolü Güvenliği: Maliyet ve kâr gizlendiği doğrulandı.');

  // 4. Quick Search by Serial / IMEI
  console.log('\n4. IMEI & Seri No ile Hızlı Arama Test Ediliyor...');
  const searchRes = await req('/products/search-quick?q=356891234567891', {}, adminToken);
  assert.strictEqual(searchRes.status, 200);
  assert.ok(searchRes.data.products.length > 0);
  console.log('✓ IMEI Arama Başarılı:', searchRes.data.products[0].name, '- IMEI:', searchRes.data.products[0].imei);

  // 5. Add a Test Product
  console.log('\n5. Yeni Ürün Kartı Tanımlama Test Ediliyor...');
  const categoriesRes = await req('/categories', {}, adminToken);
  const firstCatId = categoriesRes.data.categories[0].id;
  const newProdRes = await req('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sony PlayStation Portal Uzaktan Oynatıcı',
      category_id: firstCatId,
      brand: 'Sony',
      model: 'PlayStation Portal Remote Player',
      serial_number: 'SN-TEST-PORTAL-42',
      condition: 'zero',
      cosmetic_grade: 'Sıfır Kapalı Kutu',
      specs: '8 inç 1080p 60fps LCD Ekran, DualSense Haptik Titreşim, PS5 Remote Play',
      purchase_price: 9500,
      estimated_sale_price: 11900
    })
  }, adminToken);
  assert.strictEqual(newProdRes.status, 201);
  const newProdId = newProdRes.data.productId;
  console.log('✓ Yeni Ürün Eklendi: ID', newProdId, 'Kod:', newProdRes.data.productCode);

  // 6. POS Sale Transaction
  console.log('\n6. Satış İşlemi ve Cari Hesap Entegrasyonu Test Ediliyor...');
  const carilerRes = await req('/cariler', {}, adminToken);
  const customer = carilerRes.data.cariler.find(c => c.type === 'customer' || c.type === 'both');
  assert.ok(customer);
  const initialBalance = customer.balance_cents;

  // Sell the new product for 12.000 TL, collect 5.000 TL down payment, remaining 7.000 TL added to customer balance
  const saleRes = await req('/sales', {
    method: 'POST',
    body: JSON.stringify({
      cari_id: customer.id,
      sale_date: '2026-10-15',
      payment_method: 'kredi_karti',
      collected_amount: 5000,
      notes: 'Test satış işlemi',
      items: [
        { product_id: newProdId, sale_price: 12000 }
      ]
    })
  }, adminToken);

  assert.strictEqual(saleRes.status, 201);
  assert.ok(saleRes.data.invoiceNo);
  console.log('✓ Satış Başarıyla Tamamlandı: Fatura No:', saleRes.data.invoiceNo);

  // Verify product is now marked 'sold'
  const prodCheck = await req(`/products/${newProdId}`, {}, adminToken);
  assert.strictEqual(prodCheck.data.product.status, 'sold');
  console.log('✓ Ürün Durumu Otomatik "sold" (Satıldı) Olarak Güncellendi.');

  // Verify Cari balance updated: balance should increase by exactly 7.000 TL (700.000 kuruş)
  const cariCheck = await req(`/cariler/${customer.id}`, {}, adminToken);
  const expectedBalance = initialBalance + 700000;
  assert.strictEqual(cariCheck.data.cari.balance_cents, expectedBalance);
  console.log('✓ Müşteri Cari Bakiyesi Hatasız Güncellendi:');
  console.log('  - Önceki Bakiye:', (initialBalance / 100).toLocaleString('tr-TR'), 'TL');
  console.log('  - Kalan Alacak:', (700000 / 100).toLocaleString('tr-TR'), 'TL');
  console.log('  - Yeni Güncel Bakiye:', (cariCheck.data.cari.balance_cents / 100).toLocaleString('tr-TR'), 'TL');

  // 7. Cari Chronological Statement (Ekstre)
  console.log('\n7. Cari Hesap Ekstresi (Yürüyen Bakiye) Test Ediliyor...');
  const stmtRes = await req(`/cariler/${customer.id}/statement`, {}, adminToken);
  assert.strictEqual(stmtRes.status, 200);
  assert.ok(stmtRes.data.statement.length > 0);
  console.log('✓ Cari Ekstresi Başarıyla Alındı:', stmtRes.data.statement.length, 'adet işlem');

  // 8. Partial Payment / Collection
  console.log('\n8. Kısmi Tahsilat Girişi Test Ediliyor...');
  const paymentRes = await req('/payments', {
    method: 'POST',
    body: JSON.stringify({
      cari_id: customer.id,
      type: 'collection',
      amount: 3000,
      payment_method: 'havale_eft',
      date: '2026-10-15',
      description: 'Müşteriden 3.000 TL ara tahsilat'
    })
  }, adminToken);
  assert.strictEqual(paymentRes.status, 201);
  console.log('✓ 3.000 TL Tahsilat Yapıldı. Makbuz No:', paymentRes.data.receiptNo);

  const cariAfterPay = await req(`/cariler/${customer.id}`, {}, adminToken);
  assert.strictEqual(cariAfterPay.data.cari.balance_cents, expectedBalance - 300000);
  console.log('✓ Kalan Müşteri Alacağı:', (cariAfterPay.data.cari.balance_cents / 100).toLocaleString('tr-TR'), 'TL (3.000 TL düştü)');

  // 9. Operating Expense Entry
  console.log('\n9. Masraf Yönetimi Test Ediliyor...');
  const expRes = await req('/expenses', {
    method: 'POST',
    body: JSON.stringify({
      category: 'Kargo',
      amount: 450,
      date: '2026-10-15',
      payment_method: 'nakit',
      description: 'Konya içi hızlı kurye sevkiyatı'
    })
  }, adminToken);
  assert.strictEqual(expRes.status, 201);
  console.log('✓ Masraf Eklendi: Fiş No:', expRes.data.expenseNo, 'Tutar: 450 TL');

  // 10. Audit Log Verification
  console.log('\n10. Audit Log / İşlem Geçmişi Test Ediliyor...');
  const auditRes = await req('/audit?limit=5', {}, adminToken);
  assert.strictEqual(auditRes.status, 200);
  assert.ok(auditRes.data.logs.length > 0);
  console.log('✓ Son Audit Kaydı:', auditRes.data.logs[0].action, auditRes.data.logs[0].entity_type, auditRes.data.logs[0].details_json);

  // 11. Reports Comprehensive
  console.log('\n11. Raporlama API Test Ediliyor...');
  const reportRes = await req('/reports/comprehensive', {}, adminToken);
  assert.strictEqual(reportRes.status, 200);
  assert.ok(reportRes.data.summary.totalSales > 0);
  console.log('✓ Raporlama Başarılı: Toplam Satış:', (reportRes.data.summary.totalSales / 100).toLocaleString('tr-TR'), 'TL, Net Kâr:', (reportRes.data.summary.netProfit / 100).toLocaleString('tr-TR'), 'TL');

  console.log('\n======================================================');
  console.log('  TÜM SİSTEM FONKSİYONLARI VE TESTLERİ BAŞARIYLA GEÇTİ!  ');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('TEST BAŞARISIZ:', err);
  process.exit(1);
});
