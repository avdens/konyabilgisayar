const assert = require('assert');

async function testAdvanced() {
  const BASE_URL = 'http://localhost:5001/api';
  console.log('--- KONYA BİLGİSAYAR - İLERİ SEVİYE & ÇÖP KUTUSU / ALIŞ / YEDEK TESTLERİ ---');

  async function req(url, options = {}, token = null) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  // 1. Admin login
  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert.strictEqual(login.status, 200);
  const token = login.data.token;
  console.log('✓ Giriş Başarılı');

  // 2. Multi-item purchase test
  console.log('\n1. Çoklu Ürün Alışı (Multi-item Purchase) Test Ediliyor...');
  const carilerRes = await req('/cariler?type=supplier', {}, token);
  const supplier = carilerRes.data.cariler[0];
  assert.ok(supplier);

  const categoriesRes = await req('/categories', {}, token);
  const cat = categoriesRes.data.categories[0];

  const purchaseRes = await req('/purchases', {
    method: 'POST',
    body: JSON.stringify({
      cari_id: supplier.id,
      purchase_date: '2026-10-15',
      payment_method: 'havale_eft',
      paid_amount: 10000,
      notes: 'Test çoklu ürün alımı',
      items: [
        {
          name: 'Test Cihaz Alpha',
          category_id: cat.id,
          brand: 'Samsung',
          model: 'Galaxy Tab S9',
          serial_number: 'SN-TAB-ALPHA',
          condition: 'zero',
          purchase_price: 15000,
          estimated_sale_price: 19000
        },
        {
          name: 'Test Cihaz Beta',
          category_id: cat.id,
          brand: 'Samsung',
          model: 'Galaxy Buds 3 Pro',
          serial_number: 'SN-BUDS-BETA',
          condition: 'zero',
          purchase_price: 5000,
          estimated_sale_price: 7000
        }
      ]
    })
  }, token);

  assert.strictEqual(purchaseRes.status, 201);
  console.log('✓ Çoklu Alış Başarılı. Fatura No:', purchaseRes.data.invoiceNo);

  // 3. Test Soft Delete to Trash & Restore
  console.log('\n2. Ürün Çöp Kutusuna Taşıma ve Geri Yükleme Test Ediliyor...');
  const searchQuick = await req('/products/search-quick?q=SN-TAB-ALPHA', {}, token);
  assert.ok(searchQuick.data.products.length > 0);
  const prodToDelete = searchQuick.data.products[0];

  // Soft delete product
  const delRes = await req(`/products/${prodToDelete.id}`, { method: 'DELETE' }, token);
  assert.strictEqual(delRes.status, 200);
  console.log('✓ Ürün Çöp Kutusuna Taşındı:', prodToDelete.name);

  // Check trash bin
  const trashRes = await req('/trash', {}, token);
  assert.strictEqual(trashRes.status, 200);
  const inTrash = trashRes.data.items.find(i => i.item_type === 'product' && i.id === prodToDelete.id);
  assert.ok(inTrash);
  console.log('✓ Ürün Çöp Kutusunda Listelendi.');

  // Restore product
  const restoreRes = await req('/trash/restore', {
    method: 'POST',
    body: JSON.stringify({ type: 'product', id: prodToDelete.id })
  }, token);
  assert.strictEqual(restoreRes.status, 200);
  console.log('✓ Ürün Çöp Kutusundan Başarıyla Geri Yüklendi.');

  // Verify product is back in search
  const checkRestored = await req('/products/search-quick?q=SN-TAB-ALPHA', {}, token);
  assert.strictEqual(checkRestored.data.products[0].is_deleted, 0);
  console.log('✓ Geri Yüklenen Ürün Tekrar Aktif Listede Doğrulandı.');

  // 4. Test Permanent Purge from Trash
  console.log('\n3. Çöp Kutusundan Kalıcı Olarak Silme (Purge) Test Ediliyor...');
  // Delete again to trash
  await req(`/products/${prodToDelete.id}`, { method: 'DELETE' }, token);
  // Now purge permanently
  const purgeRes = await req('/trash/purge', {
    method: 'DELETE',
    body: JSON.stringify({ type: 'product', id: prodToDelete.id })
  }, token);
  assert.strictEqual(purgeRes.status, 200);
  console.log('✓ Ürün Kalıcı Olarak Silindi (Purged).');

  // Verify it no longer exists anywhere
  const finalCheck = await req(`/products/${prodToDelete.id}`, {}, token);
  assert.strictEqual(finalCheck.status, 404);
  console.log('✓ Ürünün Veritabanından Tamamen Kaldırıldığı Doğrulandı.');

  // 5. Test Safety Check on Purging Cari with Invoices
  console.log('\n4. İşlem Görmüş Cariyi Kalıcı Silme Koruması Test Ediliyor...');
  const cariPurgeFail = await req('/trash/purge', {
    method: 'POST',
    body: JSON.stringify({ type: 'cari', id: supplier.id })
  }, token);
  assert.strictEqual(cariPurgeFail.status, 400);
  console.log('✓ Güvenlik Koruması Başarılı: Faturalı cari kalıcı silinemedi:', cariPurgeFail.data.message);

  // 6. Test Excel Export
  console.log('\n5. Excel Rapor İndirme API Test Ediliyor...');
  const excelRes = await fetch(`${BASE_URL}/reports/export/excel`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(excelRes.status, 200);
  const excelBuffer = await excelRes.arrayBuffer();
  assert.ok(excelBuffer.byteLength > 1000);
  console.log('✓ Excel Dışa Aktarım Başarılı: Dosya Boyutu:', excelBuffer.byteLength, 'byte');

  // 7. Test Database Backup
  console.log('\n6. Veritabanı (.db) ve JSON Yedekleme Test Ediliyor...');
  const dbBackupRes = await fetch(`${BASE_URL}/settings/backup/download`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(dbBackupRes.status, 200);
  const dbBuf = await dbBackupRes.arrayBuffer();
  assert.ok(dbBuf.byteLength > 10000);
  console.log('✓ SQLite DB Yedeği İndirildi:', dbBuf.byteLength, 'byte');

  const jsonBackupRes = await fetch(`${BASE_URL}/settings/backup/json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(jsonBackupRes.status, 200);
  const jsonBackup = await jsonBackupRes.json();
  assert.strictEqual(jsonBackup.company, 'KONYA BİLGİSAYAR');
  assert.ok(jsonBackup.products.length > 0);
  console.log('✓ JSON Tam Sistem Yedeği İndirildi: Ürün Sayısı:', jsonBackup.products.length);

  console.log('\n======================================================');
  console.log('  TÜM İLERİ SEVİYE SİSTEM TESTLERİ BAŞARIYLA TAMAMLANDI! ');
  console.log('======================================================\n');
}

testAdvanced().catch(err => {
  console.error('İLERİ SEVİYE TEST BAŞARISIZ:', err);
  process.exit(1);
});
